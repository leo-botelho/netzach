import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getModuleLimit } from '../lib/planLimits';

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
  const [state, setState] = useState<CreditState>({ canUse: true, remaining: null, loading: true });
  const weekStart = getWeekStart();

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setState({ canUse: false, remaining: 0, loading: false }); return; }

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan_type')
      .eq('user_id', session.user.id)
      .single();

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
      .eq('user_id', session.user.id)
      .eq('week_start', weekStart)
      .eq('module', module)
      .maybeSingle();

    const used = data?.used ?? 0;
    const remaining = Math.max(0, limit - used);
    setState({ canUse: remaining > 0, remaining, loading: false });
  }, [module, weekStart]);

  useEffect(() => { load(); }, [load]);

  const increment = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('plan_credits')
      .select('used')
      .eq('user_id', session.user.id)
      .eq('week_start', weekStart)
      .eq('module', module)
      .maybeSingle();

    const used = (data?.used ?? 0) + 1;
    await supabase
      .from('plan_credits')
      .upsert({ user_id: session.user.id, week_start: weekStart, module, used }, { onConflict: 'user_id,week_start,module' });

    await load();
  }, [module, weekStart, load]);

  return { ...state, increment };
}
