import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/useAuth';

const FREE_MODULES = new Set(['ciclo', 'checkin_basico']);

export function usePlan() {
  const { userId, carregando: carregandoSessao } = useAuth();
  const [planType, setPlanType] = useState<string>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (carregandoSessao) return;
    if (!userId) { setLoading(false); return; }

    let ativo = true;
    supabase.from('profiles').select('plan_type').eq('user_id', userId).maybeSingle()
      .then(({ data, error }) => {
        if (!ativo) return;
        if (error) console.error('Falha ao ler o plano:', error.message);
        setPlanType(data?.plan_type ?? 'free');
        setLoading(false);
      });
    return () => { ativo = false; };
  }, [userId, carregandoSessao]);

  const isFree = planType === 'free';
  const canAccess = (module: string) => !isFree || FREE_MODULES.has(module);

  return { planType, isFree, isPaid: !isFree, canAccess, loading };
}
