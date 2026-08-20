import { useState } from 'react';
import { X, Smartphone, Share, MoreVertical, Plus, Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface Props {
  onClose: () => void;
}

export function InstallPWAModal({ onClose }: Props) {
  const { isInstallable, isInstalled, platform, triggerInstall } = usePWAInstall();
  const [installing, setInstalling] = useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    await triggerInstall();
    setInstalling(false);
    onClose();
  };

  if (isInstalled) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-netzach-card border border-netzach-border rounded-2xl p-6 w-full max-w-sm text-center animate-in slide-in-from-bottom-4">
          <div className="text-4xl mb-3">✦</div>
          <h2 className="font-mystic text-netzach-gold text-lg mb-2">Netzach já está instalado</h2>
          <p className="text-sm text-netzach-muted mb-4">O app está na sua tela inicial. Você pode abri-lo de lá a qualquer momento.</p>
          <button onClick={onClose} className="w-full bg-netzach-accent-deep text-white py-3 rounded-xl font-mystic">
            Entendido ✦
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-netzach-card border border-netzach-border rounded-2xl w-full max-w-sm animate-in slide-in-from-bottom-4">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-netzach-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-900 to-netzach-accent flex items-center justify-center">
              <Smartphone size={20} className="text-netzach-gold" />
            </div>
            <div>
              <h2 className="font-mystic text-netzach-gold text-base leading-none">Instalar Netzach</h2>
              <p className="text-[11px] text-netzach-muted mt-0.5">Acesso rápido na tela inicial</p>
            </div>
          </div>
          <button onClick={onClose} className="text-netzach-muted hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* Android, prompt nativo disponível */}
          {platform === 'android' && isInstallable && (
            <>
              <p className="text-sm text-netzach-muted text-center">
                Instale o Netzach como app no seu celular, sem precisar da Play Store.
              </p>
              <button
                onClick={handleInstall}
                disabled={installing}
                className="w-full flex items-center justify-center gap-2 bg-netzach-gold text-netzach-bg py-3 rounded-xl font-mystic font-bold hover:bg-white transition-colors disabled:opacity-50"
              >
                <Download size={18} />
                {installing ? 'Instalando...' : 'Instalar agora'}
              </button>
            </>
          )}

          {/* Android, sem prompt (já foi dispensado ou não suportado) */}
          {platform === 'android' && !isInstallable && (
            <div className="space-y-3">
              <p className="text-sm text-netzach-muted text-center">Siga os passos para adicionar à tela inicial:</p>
              <Step number={1} icon={<MoreVertical size={16} />} text='Toque no menu "⋮" no canto superior direito do Chrome' />
              <Step number={2} icon={<Plus size={16} />} text='"Adicionar à tela inicial"' />
              <Step number={3} text='Confirme tocando em "Adicionar"' />
            </div>
          )}

          {/* iOS */}
          {platform === 'ios' && (
            <div className="space-y-3">
              <p className="text-sm text-netzach-muted text-center">Abra este site no Safari e siga os passos:</p>
              <Step number={1} icon={<Share size={16} />} text='Toque no ícone de compartilhar (quadrado com seta para cima)' />
              <Step number={2} icon={<Plus size={16} />} text='"Adicionar à Tela de Início"' />
              <Step number={3} text='Toque em "Adicionar" no canto superior direito' />
              <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl px-3 py-2 text-[11px] text-amber-400">
                ⚠️ Use o Safari, outros browsers no iOS não suportam instalação de PWA.
              </div>
            </div>
          )}

          {/* Desktop */}
          {platform === 'desktop' && (
            <div className="space-y-3">
              <p className="text-sm text-netzach-muted text-center">Instale o Netzach no seu computador:</p>
              <Step number={1} text='No Chrome/Edge, clique no ícone de instalar (⊕) na barra de endereços' />
              <Step number={2} text='Ou clique no menu "⋮" → "Instalar Netzach..."' />
              <Step number={3} text='Confirme na janela que aparecer' />
            </div>
          )}

        </div>

        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full border border-netzach-border text-netzach-muted py-2.5 rounded-xl text-sm hover:text-white transition-colors"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({ number, icon, text }: { number: number; icon?: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-netzach-accent/20 border border-netzach-accent/40 flex items-center justify-center text-[11px] text-netzach-gold font-bold shrink-0 mt-0.5">
        {number}
      </div>
      <div className="flex items-center gap-1.5 text-sm text-netzach-text">
        {icon && <span className="text-netzach-gold">{icon}</span>}
        <span>{text}</span>
      </div>
    </div>
  );
}
