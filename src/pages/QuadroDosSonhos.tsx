import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Check, Trash2, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/useAuth';

/**
 * Quadro dos Sonhos (§6.14 do documento).
 *
 * "Painel visual textual com sonhos por categoria, afirmações
 * associadas e lembretes periódicos." Faz parte do módulo de Lei da
 * Atração e não se confunde com o diário de sonhos (§9), que registra
 * o que ela sonhou dormindo.
 */

/**
 * As mesmas dez áreas da Roda da Vida, conferidas na tabela real em
 * 19/08/2026. O documento descreve a roda com outros nomes (vida
 * emocional, autoconhecimento, criatividade), mas o que a usuária
 * preenche no cadastro é isto — e o quadro precisa falar a mesma
 * língua da roda, não a do documento.
 */
const AREAS = [
  { chave: 'saude',           rotulo: 'Saúde e corpo',   emoji: '🌿' },
  { chave: 'financas',        rotulo: 'Finanças',        emoji: '🌾' },
  { chave: 'carreira',        rotulo: 'Carreira',        emoji: '🔥' },
  { chave: 'amor',            rotulo: 'Amor',            emoji: '💗' },
  { chave: 'familia',         rotulo: 'Família',         emoji: '🏠' },
  { chave: 'amizades',        rotulo: 'Amizades',        emoji: '🤍' },
  { chave: 'lazer',           rotulo: 'Lazer',           emoji: '🎨' },
  { chave: 'espiritualidade', rotulo: 'Espiritualidade', emoji: '✨' },
  { chave: 'desenvolvimento', rotulo: 'Desenvolvimento', emoji: '🌱' },
  { chave: 'ambiente',        rotulo: 'Ambiente',        emoji: '🪟' },
] as const;

interface Desejo {
  id: string;
  area: string;
  dream: string;
  affirmation: string | null;
  achieved_at: string | null;
}

export default function QuadroDosSonhos() {
  const navigate = useNavigate();
  const { userId, carregando: carregandoSessao } = useAuth();

  const [desejos, setDesejos] = useState<Desejo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [novo, setNovo] = useState({ area: AREAS[0].chave as string, dream: '', affirmation: '' });

  const carregar = async (uid: string) => {
    const { data, error } = await supabase
      .from('dream_board')
      .select('id, area, dream, affirmation, achieved_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (error) console.error('Falha ao ler o quadro dos sonhos:', error.message);
    setDesejos((data ?? []) as Desejo[]);
    setCarregando(false);
  };

  useEffect(() => {
    if (carregandoSessao) return;
    if (!userId) { navigate('/portal'); return; }
    carregar(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, carregandoSessao]);

  const adicionar = async () => {
    if (!novo.dream.trim() || !userId) return;
    setSalvando(true);
    setErro(null);

    const { error } = await supabase.from('dream_board').insert({
      user_id: userId,
      area: novo.area,
      dream: novo.dream.trim(),
      affirmation: novo.affirmation.trim() || null,
    });

    setSalvando(false);

    if (error) {
      console.error('Falha ao guardar o sonho:', error.message);
      setErro('Não consegui guardar agora. Tente de novo em instantes.');
      return;
    }

    setNovo({ area: AREAS[0].chave, dream: '', affirmation: '' });
    setCriando(false);
    await carregar(userId);
  };

  const marcarRealizado = async (d: Desejo) => {
    if (!userId) return;
    const hoje = new Date().toISOString().split('T')[0];
    await supabase.from('dream_board')
      .update({ achieved_at: d.achieved_at ? null : hoje })
      .eq('id', d.id);
    await carregar(userId);
  };

  const remover = async (id: string) => {
    if (!userId) return;
    await supabase.from('dream_board').delete().eq('id', id);
    await carregar(userId);
  };

  const abertos = desejos.filter(d => !d.achieved_at);
  const realizados = desejos.filter(d => d.achieved_at);

  const porArea = AREAS
    .map(a => ({ ...a, itens: abertos.filter(d => d.area === a.chave) }))
    .filter(a => a.itens.length > 0);

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans pb-24">
      <header className="sticky top-0 z-20 bg-netzach-bg/90 backdrop-blur-md border-b border-netzach-border px-5 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Voltar"
          className="text-netzach-muted hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-mystic text-netzach-gold text-lg leading-none">Quadro dos Sonhos</h1>
          <p className="text-[11px] text-netzach-muted mt-0.5">O que você está chamando para a sua vida</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 space-y-5">
        {carregando && (
          <p className="text-center text-netzach-muted animate-pulse font-mystic py-8">Sintonizando...</p>
        )}

        {/* ── Formulário ────────────────────────────────────── */}
        {!carregando && criando && (
          <section className="bg-netzach-card border border-netzach-gold/30 rounded-2xl p-5 space-y-4 fade-up">
            <div>
              <label htmlFor="area" className="block text-xs text-netzach-muted uppercase tracking-wider mb-2">
                Que área da sua vida?
              </label>
              <select id="area" value={novo.area}
                onChange={e => setNovo(p => ({ ...p, area: e.target.value }))}
                className="input-mystic">
                {AREAS.map(a => (
                  <option key={a.chave} value={a.chave}>{a.emoji} {a.rotulo}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="sonho" className="block text-xs text-netzach-muted uppercase tracking-wider mb-2">
                O que você quer atrair?
              </label>
              <textarea id="sonho" rows={2} maxLength={500}
                value={novo.dream}
                onChange={e => setNovo(p => ({ ...p, dream: e.target.value }))}
                placeholder="Ex: uma casa com janela grande e sol da manhã"
                className="input-mystic resize-none" />
            </div>

            <div>
              <label htmlFor="afirmacao" className="block text-xs text-netzach-muted uppercase tracking-wider mb-2">
                Afirmação (opcional)
              </label>
              <input id="afirmacao" maxLength={280}
                value={novo.affirmation}
                onChange={e => setNovo(p => ({ ...p, affirmation: e.target.value }))}
                placeholder="Em primeira pessoa, no presente"
                className="input-mystic" />
              <p className="text-[11px] text-netzach-muted mt-1.5">
                Se quiser ajuda para escrever, a Lei da Atração cria uma para você.
              </p>
            </div>

            {erro && <p role="alert" className="text-sm text-netzach-rose">{erro}</p>}

            <div className="flex gap-2">
              <button onClick={() => { setCriando(false); setErro(null); }}
                className="flex-1 border border-netzach-border text-netzach-muted py-2.5 rounded-xl hover:text-white transition-colors text-sm">
                Cancelar
              </button>
              <button onClick={adicionar} disabled={!novo.dream.trim() || salvando}
                className="flex-[2] bg-netzach-gold text-netzach-bg font-bold py-2.5 rounded-xl hover:bg-white transition-colors disabled:opacity-40 text-sm">
                {salvando ? 'Guardando...' : 'Guardar no quadro'}
              </button>
            </div>
          </section>
        )}

        {!carregando && !criando && (
          <button onClick={() => setCriando(true)}
            className="w-full bg-netzach-gold text-netzach-bg font-bold font-mystic py-3.5 rounded-2xl hover:bg-white transition-colors flex items-center justify-center gap-2">
            <Plus size={18} aria-hidden="true" /> Adicionar um sonho
          </button>
        )}

        {/* ── Quadro vazio ──────────────────────────────────── */}
        {!carregando && desejos.length === 0 && !criando && (
          <div className="bg-netzach-card border border-netzach-border rounded-2xl p-8 text-center space-y-3">
            <div className="text-4xl" aria-hidden="true">✧</div>
            <h2 className="font-mystic text-netzach-gold text-lg">Seu quadro está esperando</h2>
            <p className="text-sm text-netzach-muted leading-relaxed">
              Escreva o que você quer chamar para perto, em qualquer área da sua vida. Nomear
              já é o primeiro movimento.
            </p>
          </div>
        )}

        {/* ── Sonhos por área ───────────────────────────────── */}
        {porArea.map(area => (
          <section key={area.chave}>
            <h2 className="text-xs text-netzach-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span aria-hidden="true">{area.emoji}</span> {area.rotulo}
            </h2>
            <div className="space-y-2">
              {area.itens.map(d => (
                <article key={d.id} className="bg-netzach-card border border-netzach-border rounded-xl p-4">
                  <p className="text-sm text-white leading-relaxed">{d.dream}</p>
                  {d.affirmation && (
                    <p className="text-sm text-netzach-gold/90 italic mt-2 leading-relaxed flex gap-1.5">
                      <Sparkles size={12} className="shrink-0 mt-1" aria-hidden="true" />
                      {d.affirmation}
                    </p>
                  )}
                  <div className="flex gap-3 mt-3">
                    <button onClick={() => marcarRealizado(d)}
                      className="text-[11px] text-netzach-muted hover:text-netzach-gold transition-colors flex items-center gap-1">
                      <Check size={11} /> Aconteceu
                    </button>
                    <button onClick={() => remover(d.id)}
                      className="text-[11px] text-netzach-muted hover:text-netzach-rose transition-colors flex items-center gap-1 ml-auto">
                      <Trash2 size={11} /> Remover
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}

        {/* ── Realizados ────────────────────────────────────── */}
        {realizados.length > 0 && (
          <section>
            <h2 className="text-xs text-netzach-gold uppercase tracking-wider mb-2">
              Já aconteceu ({realizados.length})
            </h2>
            <div className="space-y-2">
              {realizados.map(d => (
                <article key={d.id}
                  className="bg-netzach-gold/5 border border-netzach-gold/30 rounded-xl p-3.5 flex items-start gap-2.5">
                  <Check size={14} className="text-netzach-gold shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex-1">
                    <p className="text-sm text-netzach-text/80 leading-relaxed">{d.dream}</p>
                    <button onClick={() => marcarRealizado(d)}
                      className="text-[11px] text-netzach-muted hover:text-white transition-colors mt-1.5">
                      Devolver ao quadro
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
