import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Download, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/useAuth';
import { usePlan } from '../hooks/usePlan';
import { gerarInsight, compararLunacoes, type DiaDaLunacao, type InsightLunacao, type Comparativo } from '../lib/insightLunacao';

const LUNAR_MONTH = 29.53058867;
const NEW_MOON_REF = new Date('2000-01-06T18:14:00Z').getTime();
const TOTAL_DAYS = 29;
const CX = 160;
const CY = 160;
const GAP = 1.5; // graus de espaço entre fatias

type DayData = {
  sleep: number | null; energy: number | null; mood: number | null;
  habits: number; cicloFase?: string | null; temSonho?: boolean;
};

function getLunarDayOfCycle(date: Date = new Date()): number {
  const diff = (date.getTime() - NEW_MOON_REF) / (1000 * 60 * 60 * 24);
  const phase = (diff / LUNAR_MONTH) % 1;
  return Math.floor((phase < 0 ? phase + 1 : phase) * LUNAR_MONTH);
}

function arcPath(r1: number, r2: number, startDeg: number, endDeg: number): string {
  const toRad = (d: number) => ((d - 90) * Math.PI) / 180;
  const a1 = toRad(startDeg);
  const a2 = toRad(endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  const ix1 = CX + r1 * Math.cos(a1);
  const iy1 = CY + r1 * Math.sin(a1);
  const ox1 = CX + r2 * Math.cos(a1);
  const oy1 = CY + r2 * Math.sin(a1);
  const ox2 = CX + r2 * Math.cos(a2);
  const oy2 = CY + r2 * Math.sin(a2);
  const ix2 = CX + r1 * Math.cos(a2);
  const iy2 = CY + r1 * Math.sin(a2);
  return `M ${ix1} ${iy1} L ${ox1} ${oy1} A ${r2} ${r2} 0 ${large} 1 ${ox2} ${oy2} L ${ix2} ${iy2} A ${r1} ${r1} 0 ${large} 0 ${ix1} ${iy1} Z`;
}

function interpolateColor(from: [number, number, number], to: [number, number, number], t: number): string {
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const b = Math.round(from[2] + (to[2] - from[2]) * t);
  return `rgb(${r},${g},${b})`;
}

const PHASE_COLORS: [number, number, number][] = [
  [60, 0, 120],   // Nova: deep purple
  [20, 50, 120],  // Crescente: deep blue
  [180, 130, 10], // Cheia: gold
  [20, 80, 40],   // Minguante: deep green
];

function phaseColor(day: number): string {
  if (day < 7) return interpolateColor([20, 5, 40], PHASE_COLORS[0], day / 6);
  if (day < 15) return interpolateColor(PHASE_COLORS[0], PHASE_COLORS[1], (day - 7) / 7);
  if (day < 22) return interpolateColor(PHASE_COLORS[1], PHASE_COLORS[2], (day - 15) / 6);
  return interpolateColor(PHASE_COLORS[2], PHASE_COLORS[3], (day - 22) / 6);
}

const SLEEP_FROM: [number, number, number] = [15, 15, 35];
const SLEEP_TO: [number, number, number] = [80, 170, 255];
const MOOD_FROM: [number, number, number] = [35, 10, 5];
const MOOD_TO: [number, number, number] = [255, 200, 50];
const HABITS_FROM: [number, number, number] = [10, 10, 10];
const HABITS_TO: [number, number, number] = [34, 197, 94];

export default function MandalaLunar() {
  const navigate = useNavigate();
  const { userId, carregando: carregandoSessao } = useAuth();
  const { planType } = usePlan();
  const [data, setData] = useState<Record<string, DayData>>({});
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<InsightLunacao | null>(null);
  const [comparativo, setComparativo] = useState<Comparativo[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  // §8 do documento: Hécate vê a lunação atual; Ísis ganha o insight
  // de fechamento; Lilith soma o comparativo e a exportação.
  const temInsight = planType === 'isis' || planType === 'lilith';
  const temComparativo = planType === 'lilith';

  const today = new Date();
  const dayOfCycle = getLunarDayOfCycle(today);
  const todayStr = today.toISOString().split('T')[0];

  // Datas do ciclo lunar atual (slice 0 = dia da lua nova)
  const cycleDates: string[] = Array.from({ length: TOTAL_DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - dayOfCycle + i);
    return d.toISOString().split('T')[0];
  });

  useEffect(() => {
    if (carregandoSessao) return;
    if (!userId) { navigate('/portal'); return; }

    let ativo = true;

    async function load() {
      const de = cycleDates[0];
      const ate = todayStr;

      // A lunação anterior só é buscada quando o plano usa o
      // comparativo, para não pesar a tela de quem não o vê.
      const inicioAnterior = new Date(de);
      inicioAnterior.setDate(inicioAnterior.getDate() - TOTAL_DAYS);
      const deAnterior = inicioAnterior.toISOString().split('T')[0];

      const [{ data: checkins }, { data: habits }, { data: perfil }] = await Promise.all([
        supabase.from('daily_checkins')
          .select('date,period,energy,sleep_quality,mood,dream_notes')
          .eq('user_id', userId!)
          .gte('date', temComparativo ? deAnterior : de).lte('date', ate),
        supabase.from('habit_logs')
          .select('date').eq('user_id', userId!)
          .gte('date', temComparativo ? deAnterior : de).lte('date', ate),
        supabase.from('profiles')
          .select('last_period_date, cycle_duration').eq('user_id', userId!).maybeSingle(),
      ]);

      if (!ativo) return;

      const map: Record<string, DayData> = {};
      const vazio = (): DayData => ({ sleep: null, energy: null, mood: null, habits: 0 });

      for (const row of checkins ?? []) {
        map[row.date] = map[row.date] ?? vazio();
        if (row.period === 'morning') {
          map[row.date].sleep = row.sleep_quality ?? null;
          map[row.date].energy = row.energy ?? null;
          map[row.date].temSonho = Boolean(row.dream_notes?.trim());
        }
        if (row.period === 'evening') map[row.date].mood = row.mood ?? null;
      }
      for (const row of habits ?? []) {
        map[row.date] = map[row.date] ?? vazio();
        map[row.date].habits += 1;
      }

      // Fase do ciclo de cada dia, para o insight poder dizer
      // "exatamente na sua fase lútea".
      const inicioCiclo = perfil?.last_period_date;
      const duracao = perfil?.cycle_duration ?? 28;
      if (inicioCiclo) {
        const base = new Date(inicioCiclo).getTime();
        for (const [data_, dia] of Object.entries(map)) {
          const dias = Math.floor((new Date(data_).getTime() - base) / 86_400_000);
          if (dias < 0) continue;
          const noCiclo = (dias % duracao) + 1;
          dia.cicloFase = noCiclo <= 5 ? 'Menstruação'
            : noCiclo <= 13 ? 'Folicular'
            : noCiclo <= 17 ? 'Ovulatória' : 'Lútea';
        }
      }

      setData(map);

      // ── Insight de fechamento ────────────────────────────────
      const paraLunacao = (datas: string[]): DiaDaLunacao[] =>
        datas.map((d, i) => ({
          diaLunar: i + 1,
          fase: (i < 7 ? 'Nova' : i < 15 ? 'Crescente' : i < 22 ? 'Cheia' : 'Minguante'),
          humor: map[d]?.mood ?? null,
          sono: map[d]?.sleep ?? null,
          energia: map[d]?.energy ?? null,
          habitosCompletos: map[d]?.habits ?? 0,
          faseCiclo: map[d]?.cicloFase ?? null,
          temSonho: map[d]?.temSonho ?? false,
        }));

      if (temInsight) {
        setInsight(gerarInsight(paraLunacao(cycleDates)));
      }

      if (temComparativo) {
        const datasAnteriores = Array.from({ length: TOTAL_DAYS }, (_, i) => {
          const d = new Date(cycleDates[0]);
          d.setDate(d.getDate() - TOTAL_DAYS + i);
          return d.toISOString().split('T')[0];
        });
        setComparativo(compararLunacoes(paraLunacao(cycleDates), paraLunacao(datasAnteriores)));
      }

      setLoading(false);
    }

    load();
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, carregandoSessao, temInsight, temComparativo]);

  /**
   * Exporta a mandala como imagem (§8, exclusivo do plano Lilith).
   * O SVG é desenhado num canvas e baixado como PNG; nada sai do
   * dispositivo dela.
   */
  const exportarImagem = async () => {
    const svg = svgRef.current;
    if (!svg) return;

    const texto = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([texto], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    try {
      const img = new Image();
      await new Promise((ok, erro) => {
        img.onload = ok;
        img.onerror = () => erro(new Error('não foi possível desenhar a mandala'));
        img.src = url;
      });

      const escala = 3; // boa para compartilhar sem serrilhar
      const canvas = document.createElement('canvas');
      canvas.width = 320 * escala;
      canvas.height = 320 * escala;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#0d0d14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const link = document.createElement('a');
      link.download = `mandala-lunar-${todayStr}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Falha ao exportar a mandala:', e);
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const sliceAngle = 360 / TOTAL_DAYS;
  const phaseNames = ['Lua Nova', 'Lua Crescente', 'Lua Cheia', 'Lua Minguante'];
  const phaseEmojis = ['🌑', '🌒', '🌕', '🌘'];
  const currentPhaseIndex = dayOfCycle < 7 ? 0 : dayOfCycle < 15 ? 1 : dayOfCycle < 22 ? 2 : 3;

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans pb-24">
      <header className="sticky top-0 z-20 bg-netzach-bg/90 backdrop-blur-md border-b border-netzach-border px-5 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-netzach-muted hover:text-white"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="font-mystic text-netzach-gold text-lg leading-none">Mandala Lunar</h1>
          <p className="text-[11px] text-netzach-muted mt-0.5">Ciclo atual, dia {dayOfCycle + 1} de {TOTAL_DAYS}</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Fase atual */}
        <div className="bg-netzach-card border border-netzach-border rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">{phaseEmojis[currentPhaseIndex]}</span>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-netzach-muted font-bold">Fase atual</p>
            <p className="font-mystic text-netzach-gold">{phaseNames[currentPhaseIndex]}</p>
          </div>
          <span className="ml-auto text-xs text-netzach-muted">Dia {dayOfCycle + 1}</span>
        </div>

        {/* SVG Mandala */}
        <div className="flex justify-center">
          {loading ? (
            <div className="w-64 h-64 rounded-full border border-netzach-border flex items-center justify-center">
              <p className="text-xs text-netzach-muted">Carregando...</p>
            </div>
          ) : (
            <svg ref={svgRef} viewBox="0 0 320 320" className="w-72 h-72" xmlns="http://www.w3.org/2000/svg">
              {/* Fundo escuro */}
              <circle cx={CX} cy={CY} r={152} fill="#0d0d14" />

              {Array.from({ length: TOTAL_DAYS }, (_, i) => {
                const startDeg = i * sliceAngle + GAP / 2;
                const endDeg = (i + 1) * sliceAngle - GAP / 2;
                const date = cycleDates[i];
                const d = data[date];
                const isPast = date <= todayStr;
                const isToday = date === todayStr;

                // Ring 1: fase lunar (sempre visível como base)
                const baseColor = phaseColor(i);
                const phaseOpacity = isPast ? (isToday ? 1 : 0.85) : 0.2;

                // Ring 2: sono
                const sleepColor = d?.sleep
                  ? interpolateColor(SLEEP_FROM, SLEEP_TO, (d.sleep - 1) / 4)
                  : isPast ? 'rgb(25,25,40)' : 'rgb(15,15,25)';

                // Ring 3: humor/energia
                const moodVal = d?.mood ?? d?.energy ?? null;
                const moodColor = moodVal
                  ? interpolateColor(MOOD_FROM, MOOD_TO, (moodVal - 1) / 4)
                  : isPast ? 'rgb(30,20,10)' : 'rgb(15,10,5)';

                // Ring 4: hábitos
                const habitsColor = d?.habits
                  ? interpolateColor(HABITS_FROM, HABITS_TO, Math.min(d.habits / 5, 1))
                  : isPast ? 'rgb(12,12,12)' : 'rgb(8,8,8)';

                return (
                  <g key={i}>
                    {/* Ring 1: Fase lunar */}
                    <path d={arcPath(34, 62, startDeg, endDeg)} fill={baseColor} opacity={phaseOpacity} />
                    {/* Ring 2: Sono */}
                    <path d={arcPath(65, 90, startDeg, endDeg)} fill={sleepColor} />
                    {/* Ring 3: Humor */}
                    <path d={arcPath(93, 118, startDeg, endDeg)} fill={moodColor} />
                    {/* Ring 4: Hábitos */}
                    <path d={arcPath(121, 146, startDeg, endDeg)} fill={habitsColor} />
                    {/* Hoje: anel branco */}
                    {isToday && (
                      <path d={arcPath(33, 147, startDeg, endDeg)} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
                    )}
                  </g>
                );
              })}

              {/* Centro */}
              <circle cx={CX} cy={CY} r={31} fill="#0d0d14" stroke="#2a1a40" strokeWidth="1" />
              <text x={CX} y={CY - 6} textAnchor="middle" fill="#c9a96e" fontSize="11" fontFamily="serif">{phaseEmojis[currentPhaseIndex]}</text>
              <text x={CX} y={CY + 8} textAnchor="middle" fill="#666" fontSize="7">dia {dayOfCycle + 1}</text>
            </svg>
          )}
        </div>

        {/* ── Insight da lunação (Ísis e Lilith) ─────────────── */}
        {temInsight && insight && (
          <section className="bg-netzach-card border border-netzach-gold/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-netzach-gold" aria-hidden="true" />
              <p className="text-[10px] uppercase tracking-widest text-netzach-gold font-bold">
                O que esta lunação conta
              </p>
            </div>
            {insight.frases.map((frase, i) => (
              <p key={i} className="text-sm text-netzach-text/90 leading-relaxed">{frase}</p>
            ))}
            <p className="text-[11px] text-netzach-muted/70 pt-1">
              Baseado nos {insight.diasComRegistro} dias que você registrou.
            </p>
          </section>
        )}

        {temInsight && !loading && !insight && (
          <p className="text-sm text-netzach-muted text-center leading-relaxed">
            Continue registrando seus dias. Quando houver o suficiente, esta lunação vai ter
            uma história para contar.
          </p>
        )}

        {/* ── Convite para quem ainda não tem o insight ──────── */}
        {!temInsight && !loading && (
          <button onClick={() => navigate('/assinar')}
            className="w-full bg-netzach-card border border-netzach-border rounded-xl p-4 text-left hover:border-netzach-gold/50 transition-colors flex items-start gap-3">
            <Lock size={14} className="text-netzach-muted shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm text-white">A leitura desta lunação</p>
              <p className="text-xs text-netzach-muted mt-0.5">
                No plano Ísis, ao fechar cada lunação o portal reúne o que seus dias contaram:
                em que fase o sono foi melhor, quando o humor pesou, quantos dias você cuidou de si.
              </p>
            </div>
          </button>
        )}

        {/* ── Comparativo entre lunações (Lilith) ────────────── */}
        {temComparativo && comparativo.length > 0 && (
          <section className="bg-netzach-card border border-netzach-border rounded-xl p-4 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-netzach-muted font-bold">
              Comparado à lunação anterior
            </p>
            {comparativo.map(c => (
              <p key={c.campo} className="text-sm text-netzach-text/90 leading-relaxed">{c.frase}</p>
            ))}
          </section>
        )}

        {/* ── Exportação (Lilith) ────────────────────────────── */}
        {temComparativo && !loading && (
          <button onClick={exportarImagem}
            className="w-full border border-netzach-border text-netzach-muted py-2.5 rounded-xl hover:text-white hover:border-netzach-gold/50 transition-colors text-sm flex items-center justify-center gap-2">
            <Download size={14} aria-hidden="true" />
            Salvar mandala como imagem
          </button>
        )}

        {/* Legenda */}
        <div className="bg-netzach-card border border-netzach-border rounded-xl p-4 space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-netzach-muted font-bold">Legenda dos anéis</p>
          <div className="space-y-2.5">
            {[
              { label: 'Fase lunar', desc: 'Ciclo do mês — do escuro ao dourado', from: '#3a0080', to: '#c89010' },
              { label: 'Qualidade do sono', desc: 'Sono registrado no check-in', from: '#1a1a40', to: '#60b0ff' },
              { label: 'Humor e energia', desc: 'Média do dia — cinza a dourado', from: '#3a1a00', to: '#ffd700' },
              { label: 'Hábitos sagrados', desc: 'Hábitos concluídos no dia', from: '#111', to: '#22c55e' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-6 h-3 rounded-sm shrink-0" style={{ background: `linear-gradient(to right, ${item.from}, ${item.to})` }} />
                <div>
                  <p className="text-xs text-white font-medium">{item.label}</p>
                  <p className="text-[11px] text-netzach-muted">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-netzach-muted/60 pt-1">O anel branco marca o dia de hoje. Fatias futuras ficam apagadas.</p>
        </div>

        {/* Status dos dados */}
        {!loading && (
          <div className="bg-netzach-card border border-netzach-border rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-netzach-muted font-bold mb-2">Este ciclo</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="font-mystic text-xl text-netzach-gold">{Object.values(data).filter(d => d.sleep !== null).length}</p>
                <p className="text-[10px] text-netzach-muted">dias com sono</p>
              </div>
              <div>
                <p className="font-mystic text-xl text-netzach-gold">{Object.values(data).filter(d => d.energy !== null || d.mood !== null).length}</p>
                <p className="text-[10px] text-netzach-muted">check-ins</p>
              </div>
              <div>
                <p className="font-mystic text-xl text-netzach-gold">{Object.values(data).reduce((sum, d) => sum + d.habits, 0)}</p>
                <p className="text-[10px] text-netzach-muted">hábitos</p>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
