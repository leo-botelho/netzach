import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Lock } from 'lucide-react';
import { useCurso, useVideoDaAula } from '../hooks/useCursos';
import { aulasEmOrdem, formatarDuracao, vizinhas } from '../lib/cursos';
import PlayerAula from '../components/cursos/PlayerAula';
import Comentarios from '../components/cursos/Comentarios';

/**
 * Uma aula: o vídeo, o que ela ensina, a conversa, e o caminho para a
 * próxima.
 */
export default function CursoAula() {
  const { slug, aulaId } = useParams();
  const navigate = useNavigate();
  const { curso, modulos, progresso, temAcesso, carregando, registrarPosicao, alternarConcluida } = useCurso(slug);
  const { video, carregando: carregandoVideo } = useVideoDaAula(aulaId);

  const aulas = useMemo(() => aulasEmOrdem(modulos), [modulos]);
  const aula = aulas.find(a => a.id === aulaId) ?? null;
  const modulo = modulos.find(m => m.id === aula?.modulo_id) ?? null;
  const { anterior, proxima } = vizinhas(aulas, aulaId ?? '');
  const meuProgresso = progresso.find(p => p.aula_id === aulaId);
  const concluida = Boolean(meuProgresso?.concluida_em);

  const irPara = (id: string) => navigate(`/cursos/${slug}/aula/${id}`);

  const aoProgredir = useCallback((posicao: number, duracao: number) => {
    if (aulaId) registrarPosicao(aulaId, posicao, duracao);
  }, [aulaId, registrarPosicao]);

  if (carregando) {
    return <div className="min-h-screen bg-netzach-bg flex items-center justify-center text-netzach-gold animate-pulse font-mystic text-xl">Sintonizando...</div>;
  }

  if (!curso || !aula) {
    return (
      <div className="min-h-screen bg-netzach-bg flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-netzach-muted">Esta aula não foi encontrada.</p>
        <button onClick={() => navigate(slug ? `/cursos/${slug}` : '/cursos')} className="text-netzach-gold text-sm underline">
          Voltar ao curso
        </button>
      </div>
    );
  }

  // Sem linha de vídeo = a RLS não liberou: aula de quem não tem o curso.
  const trancada = !carregandoVideo && !video;
  const podeAvancar = (a: { gratuita: boolean } | null) => a && (temAcesso || a.gratuita);

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans pb-24">
      <header className="sticky top-0 z-20 bg-netzach-bg/90 backdrop-blur-md border-b border-netzach-border px-5 py-3.5 flex items-center gap-3">
        <button onClick={() => navigate(`/cursos/${slug}`)} aria-label="Voltar ao curso"
          className="text-netzach-muted hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <p className="text-xs text-netzach-muted truncate">{curso.titulo}</p>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-6">
        {/* ── Vídeo ──────────────────────────────────────────── */}
        {carregandoVideo ? (
          <div className="aspect-video w-full rounded-2xl bg-netzach-deep border border-netzach-border animate-pulse" />
        ) : trancada ? (
          <div className="aspect-video w-full rounded-2xl bg-netzach-deep border border-netzach-border flex flex-col items-center justify-center gap-3 text-center px-6">
            <Lock size={28} className="text-netzach-gold/70" aria-hidden="true" />
            <p className="text-sm text-netzach-muted max-w-xs">
              Esta aula se abre quando o curso for liberado para você.
            </p>
          </div>
        ) : video && (
          <PlayerAula
            key={aula.id}
            provedor={video.provedor}
            videoId={video.video_id}
            titulo={aula.titulo}
            inicioSeg={concluida ? 0 : meuProgresso?.posicao_seg ?? 0}
            onProgresso={aoProgredir}
          />
        )}

        {/* ── Sobre a aula ───────────────────────────────────── */}
        <section className="space-y-3 px-1">
          {modulo && <p className="text-[10px] uppercase tracking-widest text-netzach-muted font-bold">{modulo.titulo}</p>}
          <h1 className="font-mystic text-2xl text-white leading-tight">{aula.titulo}</h1>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-netzach-muted">{formatarDuracao(aula.duracao_seg)}</span>
            {!trancada && (
              <button onClick={() => alternarConcluida(aula.id)} aria-pressed={concluida}
                className={`text-xs px-3.5 py-2 rounded-xl border flex items-center gap-1.5 transition-colors ${
                  concluida
                    ? 'bg-netzach-gold/15 border-netzach-gold/50 text-netzach-gold'
                    : 'border-netzach-border text-netzach-muted hover:text-white hover:border-netzach-gold/40'
                }`}>
                <Check size={13} aria-hidden="true" />
                {concluida ? 'Concluída' : 'Marcar como concluída'}
              </button>
            )}
          </div>
          {aula.descricao && (
            <p className="text-sm text-netzach-text/85 leading-relaxed whitespace-pre-line pt-1">{aula.descricao}</p>
          )}
        </section>

        {/* ── Anterior / próxima ────────────────────────────── */}
        <nav className="grid grid-cols-2 gap-3" aria-label="Navegação entre aulas">
          <button onClick={() => anterior && irPara(anterior.id)} disabled={!podeAvancar(anterior)}
            className="bg-netzach-card border border-netzach-border rounded-2xl p-3.5 text-left hover:border-netzach-gold/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-netzach-muted"><ChevronLeft size={12} aria-hidden="true" /> Anterior</span>
            <span className="block text-xs text-netzach-text mt-1 line-clamp-2">{anterior?.titulo ?? 'Início do curso'}</span>
          </button>
          <button onClick={() => proxima && irPara(proxima.id)} disabled={!podeAvancar(proxima)}
            className="bg-netzach-card border border-netzach-border rounded-2xl p-3.5 text-right hover:border-netzach-gold/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <span className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-wider text-netzach-gold">Próxima <ChevronRight size={12} aria-hidden="true" /></span>
            <span className="block text-xs text-netzach-text mt-1 line-clamp-2">{proxima?.titulo ?? 'Fim do curso ✦'}</span>
          </button>
        </nav>

        {!trancada && !carregandoVideo && <Comentarios aulaId={aula.id} />}
      </main>
    </div>
  );
}
