import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/useAuth';
import {
  contarSimbolos, contarEmocoes, faseQueMaisSonha, simbolosDoTexto,
  EMOCOES_SONHO, type Sonho, type SimboloContado,
} from '../lib/simbolosOniricos';

/**
 * Diário de sonhos (§9 do documento).
 *
 * O portal nomeia o que se repete; o significado quem constrói é a
 * usuária. Por isso a tela mostra padrões e datas, e não interpreta.
 */

const EMOJI_EMOCAO = Object.fromEntries(EMOCOES_SONHO.map(e => [e.chave, e.emoji]));
const NOME_EMOCAO = Object.fromEntries(EMOCOES_SONHO.map(e => [e.chave, e.rotulo]));

const LUA_EMOJI: Record<string, string> = {
  Nova: '🌑', Crescente: '🌒', Cheia: '🌕', Minguante: '🌘',
};

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short',
  });
}

export default function DiarioSonhos() {
  const navigate = useNavigate();
  const { userId, carregando: carregandoSessao } = useAuth();
  const [sonhos, setSonhos] = useState<Sonho[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState<SimboloContado | null>(null);

  useEffect(() => {
    if (carregandoSessao) return;
    if (!userId) { navigate('/portal'); return; }

    let ativo = true;
    supabase
      .from('daily_checkins')
      .select('date, dream_notes, dream_emotion, dream_intensity, dream_moon_phase, dream_cycle_phase')
      .eq('user_id', userId)
      .not('dream_notes', 'is', null)
      .order('date', { ascending: false })
      .limit(180)
      .then(({ data, error }) => {
        if (!ativo) return;
        if (error) console.error('Falha ao ler o diário de sonhos:', error.message);
        setSonhos((data ?? []).filter(s => s.dream_notes?.trim()) as Sonho[]);
        setCarregando(false);
      });

    return () => { ativo = false; };
  }, [userId, carregandoSessao, navigate]);

  const padroes = contarSimbolos(sonhos);
  const emocoes = contarEmocoes(sonhos);
  const faseFrequente = faseQueMaisSonha(sonhos);

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans pb-24">
      <header className="sticky top-0 z-20 bg-netzach-bg/90 backdrop-blur-md border-b border-netzach-border px-5 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Voltar"
          className="text-netzach-muted hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-mystic text-netzach-gold text-lg leading-none">Diário de Sonhos</h1>
          <p className="text-[11px] text-netzach-muted mt-0.5">
            {sonhos.length > 0
              ? `${sonhos.length} ${sonhos.length === 1 ? 'sonho registrado' : 'sonhos registrados'}`
              : 'Seus símbolos ao longo do tempo'}
          </p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 space-y-6">
        {carregando && (
          <p className="text-center text-netzach-muted animate-pulse font-mystic py-8">Sintonizando...</p>
        )}

        {/* ── Ainda sem registro ─────────────────────────────── */}
        {!carregando && sonhos.length === 0 && (
          <div className="bg-netzach-card border border-netzach-border rounded-2xl p-8 text-center space-y-3">
            <div className="text-4xl" aria-hidden="true">🌙</div>
            <h2 className="font-mystic text-netzach-gold text-lg">Seu diário começa amanhã de manhã</h2>
            <p className="text-sm text-netzach-muted leading-relaxed">
              Ao acordar, escreva o que lembrar no check-in. Não precisa fazer sentido nem
              estar completo. Com o tempo, os símbolos que se repetem aparecem aqui.
            </p>
            <button onClick={() => navigate('/checkin')}
              className="w-full bg-netzach-gold text-netzach-bg font-bold py-3 rounded-xl hover:bg-white transition-colors">
              Ir para o check-in
            </button>
          </div>
        )}

        {/* ── Padrões reconhecidos ───────────────────────────── */}
        {!carregando && sonhos.length > 0 && (
          <>
            {padroes.length > 0 ? (
              <section>
                <h2 className="text-xs text-netzach-muted uppercase tracking-wider mb-3">
                  O que se repete nos seus sonhos
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {padroes.map(p => (
                    <button key={p.simbolo.chave} onClick={() => setAberto(p)}
                      className="bg-netzach-card border border-netzach-border rounded-xl p-3 text-left hover:border-netzach-gold/50 transition-colors">
                      <div className="text-2xl mb-1" aria-hidden="true">{p.simbolo.emoji}</div>
                      <p className="text-sm text-white font-medium leading-tight">{p.simbolo.nome}</p>
                      <p className="text-[11px] text-netzach-muted mt-0.5">
                        {p.ocorrencias} vezes
                      </p>
                      {p.faseLunarFrequente && (
                        <p className="text-[11px] text-netzach-gold mt-1">
                          {LUA_EMOJI[p.faseLunarFrequente] ?? '🌙'} Lua {p.faseLunarFrequente}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </section>
            ) : (
              <p className="text-sm text-netzach-muted text-center leading-relaxed py-2">
                Ainda não há símbolo que se repita. Continue registrando: os padrões aparecem
                quando algo volta pela segunda vez.
              </p>
            )}

            {/* ── Correlação com a lua ─────────────────────── */}
            {faseFrequente && (
              <section className="bg-netzach-card border border-netzach-border rounded-2xl p-4 flex items-start gap-3">
                <span className="text-2xl shrink-0" aria-hidden="true">
                  {LUA_EMOJI[faseFrequente.fase] ?? '🌙'}
                </span>
                <div>
                  <p className="text-sm text-white">
                    Você sonha mais na <strong className="text-netzach-gold">Lua {faseFrequente.fase}</strong>
                  </p>
                  <p className="text-xs text-netzach-muted mt-0.5">
                    {faseFrequente.total} dos seus {sonhos.length} registros.
                  </p>
                </div>
              </section>
            )}

            {/* ── Emoções ───────────────────────────────────── */}
            {emocoes.length > 0 && (
              <section>
                <h2 className="text-xs text-netzach-muted uppercase tracking-wider mb-3">
                  Como você se sente ao acordar
                </h2>
                <div className="flex flex-wrap gap-2">
                  {emocoes.map(({ emocao, total }) => (
                    <span key={emocao}
                      className="px-3 py-1.5 rounded-full border border-netzach-border text-xs text-netzach-muted">
                      {EMOJI_EMOCAO[emocao] ?? '·'} {NOME_EMOCAO[emocao] ?? emocao} · {total}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* ── Registros ─────────────────────────────────── */}
            <section>
              <h2 className="text-xs text-netzach-muted uppercase tracking-wider mb-3">
                Seus registros
              </h2>
              <div className="space-y-2">
                {sonhos.slice(0, 30).map(s => (
                  <article key={s.date}
                    className="bg-netzach-card border border-netzach-border rounded-xl p-3.5">
                    <div className="flex items-center gap-2 mb-1.5 text-[11px] text-netzach-muted">
                      <span className="text-netzach-gold">{formatarData(s.date)}</span>
                      {s.dream_moon_phase && <span>{LUA_EMOJI[s.dream_moon_phase] ?? '🌙'}</span>}
                      {s.dream_emotion && <span>{EMOJI_EMOCAO[s.dream_emotion] ?? ''}</span>}
                      {s.dream_intensity === 'perturbador' && (
                        <span className="text-netzach-rose">intenso</span>
                      )}
                      {s.dream_cycle_phase && <span>· {s.dream_cycle_phase}</span>}
                    </div>
                    <p className="text-sm text-netzach-text/85 leading-relaxed">{s.dream_notes}</p>
                    {simbolosDoTexto(s.dream_notes).length > 0 && (
                      <p className="mt-2 text-sm" aria-label="Símbolos reconhecidos">
                        {simbolosDoTexto(s.dream_notes).map(sim => (
                          <span key={sim.chave} title={sim.nome} className="mr-1">{sim.emoji}</span>
                        ))}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {/* ── Detalhe de um símbolo ────────────────────────────── */}
      {aberto && (
        <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50"
          onClick={() => setAberto(null)}>
          <div className="bg-netzach-card border border-netzach-border rounded-t-3xl w-full max-w-lg p-6 space-y-3"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden="true">{aberto.simbolo.emoji}</span>
              <div>
                <h2 className="font-mystic text-netzach-gold text-lg leading-none">{aberto.simbolo.nome}</h2>
                <p className="text-[11px] text-netzach-muted mt-1">
                  Apareceu {aberto.ocorrencias} vezes nos seus sonhos
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {aberto.datas.map(d => (
                <span key={d} className="text-[11px] text-netzach-muted border border-netzach-border rounded-full px-2 py-0.5">
                  {formatarData(d)}
                </span>
              ))}
            </div>

            {aberto.faseLunarFrequente && (
              <p className="text-xs text-netzach-muted flex items-center gap-1.5">
                <Moon size={12} className="text-netzach-gold" />
                Aparece mais na Lua {aberto.faseLunarFrequente}.
              </p>
            )}

            <p className="text-xs text-netzach-muted leading-relaxed border-t border-netzach-border pt-3">
              O que este símbolo diz é você quem descobre, olhando o que estava vivendo nessas
              datas. O portal só aponta o que voltou.
            </p>

            <button onClick={() => setAberto(null)}
              className="w-full border border-netzach-border text-netzach-muted py-2.5 rounded-xl hover:text-white transition-colors text-sm">
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
