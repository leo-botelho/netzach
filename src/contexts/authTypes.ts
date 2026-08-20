import { createContext } from 'react';
import type { Session } from '@supabase/supabase-js';

export interface AuthState {
  /** null = sem sessão. Só é confiável depois de `carregando` virar false. */
  session: Session | null;
  userId: string | null;
  carregando: boolean;
  sair: () => Promise<void>;
}

/**
 * Em arquivo separado do provider: o fast refresh do Vite só funciona
 * quando um módulo exporta apenas componentes.
 */
export const AuthContext = createContext<AuthState | null>(null);
