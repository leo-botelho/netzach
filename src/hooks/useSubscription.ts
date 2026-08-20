import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/useAuth';

export interface SubscriptionState {
  loading: boolean;
  isAuthenticated: boolean; // false = sem sessão
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

const INICIAL: SubscriptionState = {
  loading: true,
  isAuthenticated: false,
  isActive: false,
  isPaid: false,
  isFree: false,
  isExpired: false,
  planType: 'free',
  planName: 'Gratuito',
  subscriptionStatus: '',
  subscriptionEndDate: null,
  asaasCustomerId: null,
};

export function useSubscription(): SubscriptionState {
  const { userId, carregando: carregandoSessao } = useAuth();
  const [state, setState] = useState<SubscriptionState>(INICIAL);

  useEffect(() => {
    if (carregandoSessao) return;

    // Sem sessão não há assinatura a avaliar. Antes `isExpired` ficava
    // false aqui, e o guard só barrava inadimplência: visitante
    // anônima passava direto.
    if (!userId) {
      setState({ ...INICIAL, loading: false });
      return;
    }

    let ativo = true;
    supabase
      .from('profiles')
      .select('plan_type, subscription_status, subscription_end_date, asaas_customer_id')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!ativo) return;
        if (error) console.error('Falha ao ler a assinatura:', error.message);

        const planType = data?.plan_type ?? 'free';
        const status = data?.subscription_status ?? '';
        const endDate = data?.subscription_end_date ?? null;

        const isFree = planType === 'free' || !planType;
        const isPaid = !isFree && status === 'active';
        const isExpiredByDate = !isFree && endDate
          ? endDate < new Date().toISOString().split('T')[0]
          : false;
        const isExpired = !isFree &&
          (status === 'inactive' || status === 'overdue' || status === 'cancelled' || isExpiredByDate);

        setState({
          loading: false,
          isAuthenticated: true,
          isActive: isFree || isPaid,
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

    return () => { ativo = false; };
  }, [userId, carregandoSessao]);

  return state;
}
