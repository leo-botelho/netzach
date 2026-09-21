import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Check, Lock, ChevronDown, CircleDot, Circle } from 'lucide-react';
import { useCurso } from '../hooks/useCursos';
import {
  aulaParaContinuar, aulasEmOrdem, formatarDuracao, percentualConcluido,
  type Aula,
} from '../lib/cursos';

/**
 * Página de um curso: onde ela está, o que falta, e o botão que leva de
 * volta exatamente à aula em que parou.
 */
export default function CursoDetalhe() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { curso, modulos, progresso, temAcesso, carregando, erro } = useCurso(slug);

  const aulas = useMemo(() => aulasEmOrdem(modulos), [modulos]);
  const pct = percentualConcluido(aulas, progresso);
  const continuar = aulaParaContinuar(aulas, progresso);
  const porAula = useMemo(() => new Map(progresso.map(p => [p.aula_id, p])), [progresso]);
  const comecou = progresso.some(p => p.posicao_seg > 0 || p.concluida_em);

  // O módulo da aula de continuar começa aberto; os outros, fechados.
  const [abertos, setAbertos] = useState<Set<string> | null>(null);
  const moduloAtual = continuar?.modulo_id;
  const estaAberto = (id: string) => (abertos ? abertos.has(id) : id === moduloAtual);
  const alternar = (id: string) => {
    const atual = new Set(abertos ?? (moduloAtual ? [moduloAtual] : []));
    if (atual.has(id)) atual.delete(id); else atual.add(id);
    setAbertos(atual);
  };

  const podeAbrir = (a: Aula) => temAcesso || a.gratuita;
  const abrir = (a: Aula) => { if (podeAbrir(a)) navigate(`/cursos/${slug}/aula/${a.id}`); };

  if (carregando) {
    return <div className="min-h-screen bg-netzach-bg flex items-center justify-center text-netzach-gold animate-pulse font-mystic text-xl">Sintonizando...</div>;
  }

  if (erro || !curso) {
    return (
      <div className="min-h-screen bg-netzach-bg flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-netzach-muted">{erro ?? 'Curso não encontrado.'}</p>
        <button onClick={() => navigate('/cursos')} className="text-netzach-gold text-sm underline">Ver os cursos</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans pb-24">
      {/* ── Capa ──────────────────────────────────────────────── */}
      <div className="relative">
        <div className="aspect-[16/10] max-h-[340px] w-full overflow-hidden">
          {curso.capa_url
            ? <img src={curso.capa_url} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-gradient-to-br from-netzach-accent/40 via-netzach-card to-netzach-bg" />}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-netzach-bg via-netzach-bg/40 to-transparent" />
        <button onClick={() => navigate('/cursos')} aria-label="Voltar aos cursos"
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-netzach-bg/70 backdrop-blur border border-netzach-border flex items-center justify-center text-white hover:text-netzach-gold transition-colors">
          <ArrowLeft size={18} />
        </button>
      </div>

      <main className="max-w-lg mx-auto px-5 -mt-20 relative space-y-6">
        <header className="space-y-2">
          <h1 className="font-mystic text-3xl text-netzach-gold leading-tight">{curso.titulo}</h1>
          {curso.subtitulo && <p className="text-netzach-text/80 leading-relaxed">{curso.subtitulo}</p>}
        </header>

        {temAcesso ? (
          <section className="bg-netzach-card border border-netzach-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-netzach-muted">
                {aulas.filter(a => porAula.get(a.id)?.concluida_em).length} de {aulas.length} aulas
              </span>
              <span className="text-netzach-gold font-bold">{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-netzach-bg overflow-hidden" role="progressbar"
              aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso no curso">
              <div className="h-full bg-gradient-to-r from-netzach-gold/70 to-netzach-gold rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            {continuar && (
              <button onClick={() => abrir(continuar)}
                className="w-full bg-netzach-gold text-netzach-bg font-bold font-mystic py-3.5 rounded-xl hover:bg-white transition-colors flex items-center justify-center gap-2">
                <Play size={17} fill="currentColor" aria-hidden="true" />
                <span className="truncate">{comecou ? `Continuar: ${continuar.titulo}` : 'Começar o curso'}</span>
              </button>
            )}
          </section>
        ) : (
          <section className="bg-netzach-card border border-netzach-gold/30 rounded-2xl p-5 space-y-2">
            <p className="font-mystic text-lg text-white">Este curso ainda não faz parte da sua jornada</p>
            <p className="text-sm text-netzach-muted leading-relaxed">
              {aulas.some(a => a.gratuita)
                ? 'As aulas marcadas como amostra estão abertas para você sentir o caminho.'
                : 'Quando ele for liberado para você, as aulas se abrem aqui.'}
            </p>
          </section>
        )}

        {curso.descricao && (
          <p className="text-sm text-netzach-text/80 leading-relaxed whitespace-pre-line">{curso.descricao}</p>
        )}

        {/* ── Módulos ──────────────────────────────────────────── */}
        <section className="space-y-3" aria-label="Módulos do curso">
          {modulos.map((m, i) => {
            const lista = [...m.aulas].sort((a, b) => a.ordem - b.ordem);
            const feitas = lista.filter(a => porAula.get(a.id)?.concluida_em).length;
            const aberto = estaAberto(m.id);
            return (
              <div key={m.id} className="bg-netzach-card border border-netzach-border rounded-2xl overflow-hidden">
                <button onClick={() => alternar(m.id)} aria-expanded={aberto}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors">
                  <span className="w-8 h-8 shrink-0 rounded-full border border-netzach-gold/40 text-netzach-gold text-sm font-mystic flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-white font-mystic text-base leading-snug">{m.titulo}</span>
                    <span className="block text-[11px] text-netzach-muted mt-0.5">
                      {temAcesso ? `${feitas}/${lista.length} aulas` : `${lista.length} ${lista.length === 1 ? 'aula' : 'aulas'}`}
                    </span>
                  </span>
                  <ChevronDown size={18} aria-hidden="true"
                    className={`text-netzach-muted shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`} />
                </button>

                {aberto && (
                  <ul className="border-t border-netzach-border divide-y divide-netzach-border/60">
                    {lista.map(a => {
                      const p = porAula.get(a.id);
                      const liberada = podeAbrir(a);
                      const ehAtual = continuar?.id === a.id && temAcesso;
                      return (
                        <li key={a.id}>
                          <button onClick={() => abrir(a)} disabled={!liberada}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors disabled:cursor-not-allowed ${
                              ehAtual ? 'bg-netzach-gold/[0.06]' : 'hover:bg-white/[0.02]'
                            }`}>
                            <span className="shrink-0" aria-hidden="true">
                              {!liberada ? <Lock size={16} className="text-netzach-muted/60" />
                                : p?.concluida_em ? <Check size={16} className="text-netzach-gold" />
                                : p && p.posicao_seg > 0 ? <CircleDot size={16} className="text-netzach-gold/70" />
                                : <Circle size={16} className="text-netzach-muted/60" />}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className={`block text-sm leading-snug ${liberada ? 'text-netzach-text' : 'text-netzach-muted'}`}>
                                {a.titulo}
                              </span>
                              <span className="flex items-center gap-2 mt-0.5">
                                {a.duracao_seg ? <span className="text-[11px] text-netzach-muted">{formatarDuracao(a.duracao_seg)}</span> : null}
                                {a.gratuita && !temAcesso && (
                                  <span className="text-[9px] uppercase tracking-wider font-bold text-netzach-gold bg-netzach-gold/15 border border-netzach-gold/30 px-1.5 py-0.5 rounded-full">
                                    Amostra
                                  </span>
                                )}
                              </span>
                            </span>
                            <span className="sr-only">
                              {!liberada ? 'Trancada' : p?.concluida_em ? 'Concluída' : p && p.posicao_seg > 0 ? 'Em andamento' : 'Não iniciada'}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
