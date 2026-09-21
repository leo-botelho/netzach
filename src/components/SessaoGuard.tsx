import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';

/**
 * Exige só estar logada, sem olhar a assinatura.
 *
 * Existe para os cursos: quem comprou a formação na Hotmart comprou o
 * curso, não o plano do Netzach. O SubscriptionGuard barraria essa aluna
 * se a assinatura dela estivesse vencida, ou nem existisse. Quem pode
 * ver cada aula continua sendo decidido pela RLS de curso_acessos.
 */
export default function SessaoGuard() {
  const { userId, carregando } = useAuth();
  const { pathname } = useLocation();

  if (carregando) {
    return (
      <div className="min-h-screen bg-netzach-bg flex items-center justify-center text-netzach-gold animate-pulse font-mystic text-xl">
        Sintonizando...
      </div>
    );
  }

  // Guarda de onde veio, para voltar à aula depois de entrar.
  if (!userId) return <Navigate to="/portal" replace state={{ voltarPara: pathname }} />;

  return <Outlet />;
}
