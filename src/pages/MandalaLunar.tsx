import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

const LUNAR_MONTH = 29.53058867;
const NEW_MOON_REF = new Date('2000-01-06T18:14:00Z').getTime();
const TOTAL_DAYS = 29;
const CX = 160;
const CY = 160;
const GAP = 1.5; // graus de espaço entre fatias

type DayData = { sleep: number | null; energy: number | null; mood: number | null; habits: number };

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
  const [data, setData] = useState<Record<string, DayData>>({});
  const [loading, setLoading] = useState(true);

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
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/portal'); return; }
      const uid = session.user.id;
      const from = cycleDates[0];
      const to = todayStr;

      const [{ data: checkins }, { data: habits }] = await Promise.all([
        supabase.from('daily_checkins').select('date,period,energy,sleep_quality,mood').eq('user_id', uid).gte('date', from).lte('date', to),
        supabase.from('habit_logs').select('date').eq('user_id', uid).gte('date', from).lte('date', to),
      ]);

      const map: Record<string, DayData> = {};
      for (const row of checkins ?? []) {
        if (!map[row.date]) map[row.date] = { sleep: null, energy: null, mood: null, habits: 0 };
        if (row.period === 'morning') {
          map[row.date].sleep = row.sleep_quality ?? null;
          map[row.date].energy = row.energy ?? null;
        }
        if (row.period === 'evening') map[row.date].mood = row.mood ?? null;
      }
      for (const row of habits ?? []) {
        if (!map[row.date]) map[row.date] = { sleep: null, energy: null, mood: null, habits: 0 };
        map[row.date].habits += 1;
      }
      setData(map);
      setLoading(false);
    }
    load();
  }, []);

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
            <svg viewBox="0 0 320 320" className="w-72 h-72" xmlns="http://www.w3.org/2000/svg">
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
