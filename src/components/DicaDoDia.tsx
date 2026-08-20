import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useDicaContextual } from '../hooks/useDicaContextual';

/**
 * A dica contextual do dia, no Templo.
 *
 * Só aparece quando o sistema reconhece um padrão, o que na maioria
 * dos dias não acontece. É proposital: uma mensagem que aparece todo
 * dia deixa de ser notada.
 */

const CORES: Record<string, string> = {
  emocional: 'border-netzach-rose/40 bg-netzach-rose/5',
  sono:      'border-netzach-accent/40 bg-netzach-accent/5',
  corpo:     'border-netzach-gold/40 bg-netzach-gold/5',
};

export default function DicaDoDia() {
  const { dica, carregando, dispensar } = useDicaContextual();

  // Sem espaço reservado: a ausência de dica é o caso comum, e um
  // esqueleto piscando no Templo todo dia seria ruído.
  if (carregando || !dica) return null;

  return (
    <section
      aria-label="Mensagem do dia"
      className={`relative rounded-2xl border p-5 ${CORES[dica.pilar] ?? CORES.corpo}`}
    >
      <button
        onClick={dispensar}
        aria-label="Dispensar mensagem"
        className="absolute top-3 right-3 text-netzach-muted hover:text-white transition-colors"
      >
        <X size={16} />
      </button>

      <h2 className="font-mystic text-netzach-gold text-base pr-6 mb-1.5">{dica.titulo}</h2>
      <p className="text-sm text-netzach-text/85 leading-relaxed">{dica.texto}</p>

      {dica.convite && (
        <Link
          to={dica.convite.rota}
          className="inline-block mt-3 text-xs text-netzach-gold border-b border-netzach-gold/40 hover:border-netzach-gold transition-colors"
        >
          {dica.convite.rotulo}
        </Link>
      )}
    </section>
  );
}
