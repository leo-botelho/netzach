import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

/**
 * Liga e desliga as notificações, no Templo.
 *
 * Desativar pede confirmação. Depois de ativar, o botão "Ativar" vira
 * "Desativar" exatamente no mesmo lugar, e no iPhone um toque curto de
 * quem ia começar a rolar a tela conta como clique: as notificações se
 * desligavam sozinhas. Com dois passos, o toque acidental só abre a
 * pergunta, que some sozinha em alguns segundos.
 */

const TEMPO_CONFIRMAR_MS = 5000;

export default function CartaoNotificacoes() {
  const { isSupported, permission, isSubscribed, isLoading, erro, subscribe, unsubscribe } = usePushNotifications();
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    if (!confirmando) return;
    const t = setTimeout(() => setConfirmando(false), TEMPO_CONFIRMAR_MS);
    return () => clearTimeout(t);
  }, [confirmando]);

  if (!isSupported || permission === 'denied') return null;

  const desativar = async () => {
    setConfirmando(false);
    await unsubscribe();
  };

  return (
    <div className="bg-netzach-card border border-netzach-border rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {isSubscribed
            ? <Bell size={16} className="text-netzach-gold shrink-0" aria-hidden="true" />
            : <BellOff size={16} className="text-netzach-muted shrink-0" aria-hidden="true" />}
          <div className="min-w-0">
            <p className="text-sm text-white">{isSubscribed ? 'Notificações ativas' : 'Ativar notificações'}</p>
            <p className="text-[10px] text-netzach-muted">
              {confirmando ? 'Você deixa de receber os lembretes.' : 'Rituais, fases lunares e check-in'}
            </p>
          </div>
        </div>

        {isLoading ? (
          <span className="text-xs text-netzach-muted px-3 py-1.5 shrink-0" aria-live="polite">...</span>
        ) : !isSubscribed ? (
          <button onClick={subscribe}
            className="text-xs px-3 py-1.5 rounded-lg border border-netzach-gold/60 text-netzach-gold hover:bg-netzach-gold hover:text-netzach-bg transition-all shrink-0 touch-manipulation">
            Ativar
          </button>
        ) : confirmando ? (
          // "Manter" fica onde estava o primeiro "Desativar": um segundo
          // toque acidental no mesmo ponto mantém, não desliga.
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={desativar}
              className="text-xs px-3 py-1.5 rounded-lg border border-netzach-rose/50 text-netzach-rose touch-manipulation">
              Desativar
            </button>
            <button onClick={() => setConfirmando(false)}
              className="text-xs px-3 py-1.5 rounded-lg border border-netzach-gold/60 text-netzach-gold touch-manipulation">
              Manter
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmando(true)}
            className="text-xs px-3 py-1.5 rounded-lg border border-netzach-border text-netzach-muted hover:text-white transition-all shrink-0 touch-manipulation">
            Desativar
          </button>
        )}
      </div>

      {erro && <p role="alert" className="text-xs text-netzach-rose">{erro}</p>}
    </div>
  );
}
