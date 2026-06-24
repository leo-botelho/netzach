import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface SubscriptionState {
  loading: boolean;
  isActive: boolean;      // true = pode acessar tudo (ativo ou free)
  isPaid: boolean;        // true = tem plano pago ativo
  isFree: boolean;        // true = plano gratuito
  isExpired: boolean;     // true = tinha plano pago mas expirou/inativo
  planType: string;       // 'free', 'hecate', 'isis', 'lilith'
  planName: string;
  subscriptionStatus: string;
  subscriptionEndDate: string | null;
  asaasCustomerId: string | null;
}

const PLAN_NAMES: Record<string, string> = {
  free: 'Gratuito',
  hecate: 'Hécate',
  isis: 'Ísis',
  lilith: 'Lilith',
};

export function useSubscription(): SubscriptionState {
  const [state, setState] = useState<SubscriptionState>({
    loading: true,
    isActive: false,
    isPaid: false,
    isFree: false,
    isExpired: false,
    planType: 'free',
    planName: 'Gratuito',
    subscriptionStatus: '',
    subscriptionEndDate: null,
    asaasCustomerId: null,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setState(s => ({ ...s, loading: false, isActive: false }));
        return;
      }
      supabase
        .from('profiles')
        .select('plan_type, subscription_status, subscription_end_date, asaas_customer_id')
        .eq('user_id', session.user.id)
        .single()
        .then(({ data }) => {
          const planType = data?.plan_type ?? 'free';
          const status = data?.subscription_status ?? '';
          const endDate = data?.subscription_end_date ?? null;

          const isFree = planType === 'free' || !planType;
          const isPaid = !isFree && status === 'active';
          const isExpiredByDate = !isFree && endDate ? endDate < new Date().toISOString().split('T')[0] : false;
          const isExpired = !isFree && (status === 'inactive' || status === 'overdue' || status === 'cancelled' || isExpiredByDate);
          const isActive = isFree || isPaid;

          setState({
            loading: false,
            isActive,
            isPaid,
            isFree,
            isExpired,
            planType,
            planName: PLAN_NAMES[planType] ?? planType,
            subscriptionStatus: status,
            subscriptionEndDate: endDate,
            asaasCustomerId: data?.asaas_customer_id ?? null,
          });
        });
    });
  }, []);

  return state;
}
