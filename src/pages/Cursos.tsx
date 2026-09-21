import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PlayCircle, Lock } from 'lucide-react';
import { useCursos, type CursoNaLista } from '../hooks/useCursos';

/**
 * Vitrine dos cursos.
 *
 * Mostra os cursos publicados para toda aluna logada: os que ela já tem
 * aparecem com o progresso, os outros como convite, com as aulas de
 * amostra abertas.
 */

function Capa({ curso }: { curso: CursoNaLista }) {
  if (curso.capa_url) {
    return <img src={curso.capa_url} alt="" loading="lazy" className="w-full h-full object-cover" />;
  }
  // Sem capa, um emblema na paleta do app no lugar de um cinza vazio.
  return (
    <div className="w-full h-full bg-gradient-to-br from-netzach-accent/40 via-netzach-card to-netzach-bg flex items-center justify-center">
      <span className="font-mystic text-5xl text-netzach-gold/70" aria-hidden="true">✦</span>
    </div>
  );
}

export default function Cursos() {
  const navigate = useNavigate();
  const { cursos, carregando, erro } = useCursos();

  const meus = cursos.filter(c => c.temAcesso);
  const outros = cursos.filter(c => !c.temAcesso);

  const cartao = (c: CursoNaLista) => {
    const pct = c.totalAulas ? Math.round((c.concluidas / c.totalAulas) * 100) : 0;
    return (
      <button key={c.id} onClick={() => navigate(`/cursos/${c.slug}`)}
        className="w-full text-left bg-netzach-card border border-netzach-border rounded-3xl overflow-hidden hover:border-netzach-gold/50 transition-all group active:scale-[0.99]">
        <div className="relative aspect-[16/9] overflow-hidden">
          <Capa curso={c} />
          <div className="absolute inset-0 bg-gradient-to-t from-netzach-card via-netzach-card/20 to-transparent" />
          {!c.temAcesso && (
            <span className="absolute top-3 right-3 bg-netzach-bg/80 backdrop-blur border border-netzach-border text-netzach-muted text-[10px] uppercase tracking-wider px-2 py-1 rounded-full flex items-center gap-1">
              <Lock size={10} aria-hidden="true" /> Conhecer
            </span>
          )}
        </div>

        <div className="p-5 -mt-8 relative space-y-2">
          <h2 className="font-mystic text-xl text-white group-hover:text-netzach-gold transition-colors leading-tight">{c.titulo}</h2>
          {c.subtitulo && <p className="text-sm text-netzach-muted leading-relaxed line-clamp-2">{c.subtitulo}</p>}

          <div className="flex items-center justify-between text-xs text-netzach-muted pt-1">
            <span>{c.totalAulas} {c.totalAulas === 1 ? 'aula' : 'aulas'}</span>
            {c.temAcesso && <span className="text-netzach-gold font-bold">{pct}%</span>}
          </div>

          {c.temAcesso && (
            <div className="h-1.5 rounded-full bg-netzach-bg overflow-hidden" role="progressbar"
              aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso em ${c.titulo}`}>
              <div className="h-full bg-netzach-gold rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans pb-24">
      <header className="sticky top-0 z-20 bg-netzach-bg/90 backdrop-blur-md border-b border-netzach-border px-5 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Voltar" className="text-netzach-muted hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-mystic text-netzach-gold text-lg leading-none">Cursos ✦</h1>
          <p className="text-[11px] text-netzach-muted mt-0.5">Formações da Raquel, no seu ritmo</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 space-y-8">
        {carregando && <p className="text-center text-netzach-muted animate-pulse font-mystic py-8">Sintonizando...</p>}
        {erro && <p role="alert" className="text-center text-sm text-netzach-rose py-8">{erro}</p>}

        {!carregando && !erro && cursos.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <PlayCircle size={40} strokeWidth={1} className="mx-auto text-netzach-gold/60" aria-hidden="true" />
            <p className="text-netzach-muted text-sm">Os cursos estão sendo preparados com carinho. Logo aparecem aqui.</p>
          </div>
        )}

        {meus.length > 0 && (
          <section className="space-y-4">
            <p className="text-[10px] uppercase tracking-widest text-netzach-muted font-bold pl-1">Sua jornada</p>
            {meus.map(cartao)}
          </section>
        )}

        {outros.length > 0 && (
          <section className="space-y-4">
            <p className="text-[10px] uppercase tracking-widest text-netzach-muted font-bold pl-1">
              {meus.length > 0 ? 'Para conhecer' : 'Formações'}
            </p>
            {outros.map(cartao)}
          </section>
        )}
      </main>
    </div>
  );
}
