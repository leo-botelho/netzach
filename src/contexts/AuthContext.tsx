import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AuthContext, type AuthState } from './authTypes';

/**
 * Sessão única, compartilhada por todo o portal.
 *
 * Antes cada tela e cada hook chamava `supabase.auth.getSession()` por
 * conta própria, 34 vezes em 25 arquivos. Além do trabalho repetido,
 * `onAuthStateChange` não era usado em lugar nenhum: se o token
 * expirasse ou a usuária saísse em outra aba, a tela seguia como se
 * nada tivesse acontecido, até a próxima requisição falhar.
 */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      setSession(data.session);
      setCarregando(false);
    });

    // Reage a login, logout, expiração do token e a mudanças feitas em
    // outra aba do navegador.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      if (!ativo) return;
      setSession(novaSessao);
      setCarregando(false);
    });

    return () => { ativo = false; subscription.unsubscribe(); };
  }, []);

  const valor = useMemo<AuthState>(() => ({
    session,
    userId: session?.user.id ?? null,
    carregando,
    sair: async () => { await supabase.auth.signOut(); },
  }), [session, carregando]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
