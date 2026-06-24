import { useNavigate } from 'react-router-dom';
import { X, Sparkles } from 'lucide-react';

interface Props {
  onClose: () => void;
  moduleName?: string;
}

export default function UpgradeModal({ onClose, moduleName }: Props) {
  const navigate = useNavigate();

  return (
    <div
      className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="bg-netzach-card border border-netzach-border rounded-2xl p-6 w-full max-w-sm space-y-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-full bg-netzach-gold/20 border border-netzach-gold/40 flex items-center justify-center text-2xl">🔒</div>
          <button onClick={onClose} className="text-netzach-muted hover:text-white"><X size={20} /></button>
        </div>

        <div>
          <h2 className="font-mystic text-xl text-white">Funcionalidade Premium</h2>
          {moduleName && (
            <p className="text-sm text-netzach-muted mt-1">
              <span className="text-netzach-gold">{moduleName}</span> faz parte dos planos pagos.
            </p>
          )}
        </div>

        <ul className="space-y-2 text-sm text-netzach-text/80">
          <li className="flex items-center gap-2"><Sparkles size={14} className="text-netzach-gold shrink-0" /> Acesso a todos os módulos de práticas</li>
          <li className="flex items-center gap-2"><Sparkles size={14} className="text-netzach-gold shrink-0" /> Sacerdotisa ilimitada (plano Lilith)</li>
          <li className="flex items-center gap-2"><Sparkles size={14} className="text-netzach-gold shrink-0" /> Rituais, numerologia, mapa astral e mais</li>
        </ul>

        <button
          onClick={() => { onClose(); navigate('/assinar'); }}
          className="w-full bg-netzach-gold text-netzach-bg font-bold font-mystic py-3 rounded-xl hover:bg-white transition-colors"
        >
          Conhecer planos
        </button>
      </div>
    </div>
  );
}
