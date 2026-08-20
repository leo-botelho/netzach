import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * Guarda a rota /admin antes de a página montar.
 *
 * O AdminPanel checava o papel dentro dele mesmo, depois do primeiro
 * render: nesse intervalo os sete fetches do painel já tinham sido
 * disparados. A proteção de verdade continua sendo a RLS e a
 * verificação de papel nas edge functions; isto evita que a tela
 * apareça para quem não deveria vê-la.
 */
export default function AdminGuard() {
  const [estado, setEstado] = useState<'checando' | 'liberado' | 'negado'>('checando');

  useEffect(() => {
    let ativo = true;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { if (ativo) setEstado('negado'); return; }

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (ativo) setEstado(data?.role === 'admin' ? 'liberado' : 'negado');
    })();

    return () => { ativo = false; };
  }, []);

  if (estado === 'checando') {
    return (
      <div className="min-h-screen bg-netzach-bg flex items-center justify-center text-netzach-gold animate-pulse font-mystic text-xl">
        Sintonizando...
      </div>
    );
  }

  if (estado === 'negado') return <Navigate to="/templo" replace />;

  return <Outlet />;
}
