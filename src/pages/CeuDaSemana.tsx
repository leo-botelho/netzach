import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Sun, Moon, Sunrise } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/useAuth';

/**
 * Céu da Semana (§6.5 do documento).
 *
 * O documento pede quatro coisas: panorama dos trânsitos da semana,
 * orientação para cada dia, previsão para signo solar, lunar e
 * ascendente, e alertas de trânsitos sensíveis.
 *
 * O Templo já mostrava o panorama e as três previsões em janelas
 * separadas, e existiam duas telas inacabadas (`Sky` e `Oracle`) sem
 * rota nenhuma. Esta reúne tudo num lugar só.
 *
 * O conteúdo é publicado pela fundadora no painel administrativo: são
 * as leituras dela, não geração automática.
 */

const DIAS = [
  { chave: 'segunda', rotulo: 'Segunda', curto: 'Seg' },
  { chave: 'terca',   rotulo: 'Terça',   curto: 'Ter' },
  { chave: 'quarta',  rotulo: 'Quarta',  curto: 'Qua' },
  { chave: 'quinta',  rotulo: 'Quinta',  curto: 'Qui' },
  { chave: 'sexta',   rotulo: 'Sexta',   curto: 'Sex' },
  { chave: 'sabado',  rotulo: 'Sábado',  curto: 'Sáb' },
  { chave: 'domingo', rotulo: 'Domingo', curto: 'Dom' },
] as const;

/** Domingo é 0 em JavaScript; a semana do portal começa na segunda. */
function diaDeHoje(): string {
  const d = new Date().getDay();
  return DIAS[d === 0 ? 6 : d - 1].chave;
}

interface Linha { sign: string; type: string; content: string }

export default function CeuDaSemana() {
  const navigate = useNavigate();
  const { userId, carregando: carregandoSessao } = useAuth();

  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [signos, setSignos] = useState<{ sol?: string; lua?: string; asc?: string }>({});
  const [carregando, setCarregando] = useState(true);
  const [diaAberto, setDiaAberto] = useState<string>(diaDeHoje());

  useEffect(() => {
    if (carregandoSessao) return;
    if (!userId) { navigate('/portal'); return; }

    let ativo = true;

    (async () => {
      const [previsoes, perfil] = await Promise.all([
        supabase.from('horoscopes').select('sign, type, content')
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('sign_sun, sign_moon, sign_rising')
          .eq('user_id', userId).maybeSingle(),
      ]);

      if (!ativo) return;

      if (previsoes.error) console.error('Falha ao ler o céu:', previsoes.error.message);

      setLinhas((previsoes.data ?? []) as Linha[]);
      setSignos({
        sol: perfil.data?.sign_sun ?? undefined,
        lua: perfil.data?.sign_moon ?? undefined,
        asc: perfil.data?.sign_rising ?? undefined,
      });
      setCarregando(false);
    })();

    return () => { ativo = false; };
  }, [userId, carregandoSessao, navigate]);

  // A consulta vem ordenada da mais recente para a mais antiga, então
  // a primeira ocorrência de cada chave é a que vale.
  const primeira = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const l of linhas) {
      const chave = `${l.type}:${(l.sign ?? '').toLowerCase()}`;
      if (!mapa.has(chave) && l.content?.trim()) mapa.set(chave, l.content);
    }
    return mapa;
  }, [linhas]);

  const panorama =
    primeira.get('sky_weekly:ceu_semana') ??
    primeira.get('sky_weekly:geral') ??
    primeira.get('sky_weekly:Geral'.toLowerCase());

  const alertas = linhas.filter(l => l.type === 'transit_alert' && l.content?.trim());

  const porSigno = (signo?: string) =>
    signo ? primeira.get(`sign_weekly:${signo.toLowerCase()}`) : undefined;

  const pessoais = [
    { icone: Sun,     rotulo: 'Seu Sol',        signo: signos.sol, texto: porSigno(signos.sol) },
    { icone: Moon,    rotulo: 'Sua Lua',        signo: signos.lua, texto: porSigno(signos.lua) },
    { icone: Sunrise, rotulo: 'Seu Ascendente', signo: signos.asc, texto: porSigno(signos.asc) },
  ].filter(p => p.signo);

  const diasComTexto = DIAS
    .map(d => ({ ...d, texto: primeira.get(`day_weekly:${d.chave}`) }))
    .filter(d => d.texto);

  const temAlgo = panorama || alertas.length > 0 || pessoais.some(p => p.texto) || diasComTexto.length > 0;

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans pb-24">
      <header className="sticky top-0 z-20 bg-netzach-bg/90 backdrop-blur-md border-b border-netzach-border px-5 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Voltar"
          className="text-netzach-muted hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-mystic text-netzach-gold text-lg leading-none">Céu da Semana</h1>
          <p className="text-[11px] text-netzach-muted mt-0.5">O que os trânsitos pedem de você agora</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 space-y-6">
        {carregando && (
          <p className="text-center text-netzach-muted animate-pulse font-mystic py-8">Sintonizando...</p>
        )}

        {!carregando && !temAlgo && (
          <div className="bg-netzach-card border border-netzach-border rounded-2xl p-8 text-center space-y-3">
            <div className="text-4xl" aria-hidden="true">✧</div>
            <h2 className="font-mystic text-netzach-gold text-lg">A leitura desta semana está sendo preparada</h2>
            <p className="text-sm text-netzach-muted leading-relaxed">
              Volte em breve. Enquanto isso, o Templo continua com o arcano e o banho do dia.
            </p>
          </div>
        )}

        {!carregando && temAlgo && (
          <>
            {/* ── Alertas primeiro: é o que muda o dia dela ──── */}
            {alertas.map((a, i) => (
              <section key={`${a.sign}-${i}`}
                className="rounded-2xl border border-netzach-gold/40 bg-netzach-gold/5 p-4 flex gap-3">
                <AlertTriangle size={18} className="text-netzach-gold shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  {a.sign && a.sign !== 'transito' && (
                    <p className="text-xs text-netzach-gold uppercase tracking-wider font-bold mb-1">
                      {a.sign}
                    </p>
                  )}
                  <p className="text-sm text-netzach-text/90 leading-relaxed whitespace-pre-wrap">{a.content}</p>
                </div>
              </section>
            ))}

            {/* ── Panorama ───────────────────────────────────── */}
            {panorama && (
              <section className="bg-netzach-card border border-netzach-border rounded-2xl p-5">
                <h2 className="text-xs text-netzach-gold uppercase tracking-wider font-bold mb-2">
                  Panorama da semana
                </h2>
                <p className="text-sm text-netzach-text/90 leading-relaxed whitespace-pre-wrap">{panorama}</p>
              </section>
            )}

            {/* ── Dia a dia ──────────────────────────────────── */}
            {diasComTexto.length > 0 && (
              <section>
                <h2 className="text-xs text-netzach-muted uppercase tracking-wider mb-3">Dia a dia</h2>

                <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
                  {diasComTexto.map(d => (
                    <button key={d.chave} onClick={() => setDiaAberto(d.chave)}
                      aria-pressed={diaAberto === d.chave}
                      className={`shrink-0 px-3 py-1.5 rounded-full border text-xs transition-all ${
                        diaAberto === d.chave
                          ? 'border-netzach-gold bg-netzach-gold/10 text-white'
                          : 'border-netzach-border text-netzach-muted hover:text-white'
                      }`}>
                      {d.curto}
                      {d.chave === diaDeHoje() && <span className="ml-1 text-netzach-gold" aria-label="hoje">·</span>}
                    </button>
                  ))}
                </div>

                {diasComTexto.filter(d => d.chave === diaAberto).map(d => (
                  <div key={d.chave} className="bg-netzach-card border border-netzach-border rounded-2xl p-5">
                    <p className="font-mystic text-netzach-gold mb-2">
                      {d.rotulo}{d.chave === diaDeHoje() && ', hoje'}
                    </p>
                    <p className="text-sm text-netzach-text/90 leading-relaxed whitespace-pre-wrap">{d.texto}</p>
                  </div>
                ))}
              </section>
            )}

            {/* ── Previsões pessoais ─────────────────────────── */}
            {pessoais.length > 0 && (
              <section>
                <h2 className="text-xs text-netzach-muted uppercase tracking-wider mb-3">Para o seu mapa</h2>
                <div className="space-y-2">
                  {pessoais.map(({ icone: Icone, rotulo, signo, texto }) => (
                    <article key={rotulo} className="bg-netzach-card border border-netzach-border rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Icone size={14} className="text-netzach-gold" aria-hidden="true" />
                        <span className="text-[11px] uppercase tracking-wider text-netzach-muted">{rotulo}</span>
                        <span className="text-sm text-white font-mystic">{signo}</span>
                      </div>
                      <p className="text-sm text-netzach-text/85 leading-relaxed whitespace-pre-wrap">
                        {texto ?? 'A leitura deste signo ainda não foi publicada esta semana.'}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* ── Sem mapa calculado ─────────────────────────── */}
            {pessoais.length === 0 && (
              <button onClick={() => navigate('/perfil')}
                className="w-full bg-netzach-card border border-netzach-border rounded-xl p-4 text-left hover:border-netzach-gold/50 transition-colors">
                <p className="text-sm text-white">Calcule seu mapa para receber a leitura pessoal</p>
                <p className="text-xs text-netzach-muted mt-0.5">
                  Com data, hora e cidade de nascimento, o céu passa a falar do seu Sol, da sua Lua e do seu Ascendente.
                </p>
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
}
