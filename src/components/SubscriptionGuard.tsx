import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import { supabase } from '../lib/supabase';

export default function SubscriptionGuard() {
  const sub = useSubscription();
  const navigate = useNavigate();

  if (sub.loading) {
    return (
      <div className="min-h-screen bg-netzach-bg flex items-center justify-center text-netzach-gold animate-pulse font-mystic text-xl">
        Sintonizando...
      </div>
    );
  }

  // Sem sessão não há o que liberar. Antes esta checagem não existia
  // e cada página tinha que se defender sozinha, depois de montar.
  if (!sub.isAuthenticated) {
    return <Navigate to="/portal" replace />;
  }

  if (sub.isExpired) {
    return (
      <div className="min-h-screen bg-netzach-bg flex flex-col items-center justify-center text-center p-6 font-sans">
        <div className="bg-netzach-card border border-netzach-border p-8 rounded-2xl shadow-2xl max-w-sm space-y-4">
          <div className="text-4xl">🔒</div>
          <h1 className="text-2xl font-mystic text-netzach-gold">Assinatura Pausada</h1>
          <p className="text-netzach-text/80 text-sm leading-relaxed">
            Sua assinatura <strong className="text-white">{sub.planName}</strong> está{' '}
            {sub.subscriptionStatus === 'overdue' ? 'com pagamento pendente' : 'inativa'}.
            Renove para continuar sua jornada.
          </p>
          {sub.subscriptionEndDate && (
            <p className="text-xs text-netzach-muted">
              Vencimento: {new Date(sub.subscriptionEndDate + 'T00:00:00').toLocaleDateString('pt-BR')}
            </p>
          )}
          <button
            onClick={() => navigate('/assinar')}
            className="w-full bg-netzach-gold text-netzach-bg font-bold py-3 rounded-xl hover:bg-white transition-colors"
          >
            Renovar Agora
          </button>
          <button
            onClick={() => navigate('/perfil')}
            className="w-full border border-netzach-border text-netzach-muted py-3 rounded-xl hover:text-white transition-colors text-sm"
          >
            Ver minha conta
          </button>
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate('/portal'); }}
            className="text-xs text-netzach-muted hover:text-white transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
