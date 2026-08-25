import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * Leva para /nova-senha quem chegou por um link de recuperação, não importa
 * em que porta do app o link tenha deixado a pessoa.
 *
 * O destino do link é decidido pelo Supabase no momento do envio, e nem
 * sempre é o que a gente pediu: o painel administrativo manda recuperação
 * sem destino nenhum, e aí ele usa a Site URL — a home. A pessoa recebia o
 * email, clicava, e caía na página inicial sem entender o que fazer.
 *
 * Aqui não olhamos o endereço: olhamos o evento. Se o Supabase abriu uma
 * sessão de recuperação, a pessoa quer trocar a senha, e é para lá que ela
 * vai.
 */
export default function DesvioRecuperacao() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(evento => {
      if (evento === 'PASSWORD_RECOVERY' && pathname !== '/nova-senha') {
        navigate('/nova-senha', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, pathname]);

  return null;
}
