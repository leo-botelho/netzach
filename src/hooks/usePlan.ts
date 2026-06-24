import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const FREE_MODULES = new Set(['ciclo', 'checkin_basico']);

export function usePlan() {
  const [planType, setPlanType] = useState<string>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return; }
      supabase.from('profiles').select('plan_type').eq('user_id', session.user.id).single()
        .then(({ data }) => { setPlanType(data?.plan_type ?? 'free'); setLoading(false); });
    });
  }, []);

  const isFree = planType === 'free';
  const canAccess = (module: string) => !isFree || FREE_MODULES.has(module);

  return { planType, isFree, isPaid: !isFree, canAccess, loading };
}
