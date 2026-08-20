import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getModuleLimit } from '../lib/planLimits';
import { useAuth } from '../contexts/useAuth';

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

interface CreditState {
  canUse: boolean;
  remaining: number | null;
  loading: boolean;
}

export function usePlanCredit(module: string) {
  const { userId, carregando: carregandoSessao } = useAuth();
  const [state, setState] = useState<CreditState>({ canUse: true, remaining: null, loading: true });
  const weekStart = getWeekStart();

  const load = useCallback(async () => {
    if (carregandoSessao) return;
    if (!userId) { setState({ canUse: false, remaining: 0, loading: false }); return; }

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan_type')
      .eq('user_id', userId)
      .maybeSingle();

    const planType = profile?.plan_type ?? 'free';
    if (planType === 'free') {
      setState({ canUse: false, remaining: 0, loading: false });
      return;
    }

    const limit = getModuleLimit(planType, module);
    if (limit === null) {
      setState({ canUse: true, remaining: null, loading: false });
      return;
    }

    const { data } = await supabase
      .from('plan_credits')
      .select('used')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .eq('module', module)
      .maybeSingle();

    const remaining = Math.max(0, limit - (data?.used ?? 0));
    setState({ canUse: remaining > 0, remaining, loading: false });
  }, [module, weekStart, userId, carregandoSessao]);

  useEffect(() => { load(); }, [load]);

  // O débito acontece no servidor (consume_module_credit), dentro da
  // mesma transação que confere o limite. O cliente apenas relê o
  // saldo: escrever daqui deixaria de funcionar de todo modo, já que
  // a RLS agora dá à usuária apenas leitura em plan_credits.
  return { ...state, refresh: load };
}
