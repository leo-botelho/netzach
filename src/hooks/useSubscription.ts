import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/useAuth';
import { avaliarAssinatura } from '../lib/assinatura';

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

        // A regra mora em lib/assinatura.ts, compartilhada com o painel:
        // antes o app e a tela da Raquel podiam discordar sobre quem
        // estava bloqueada.
        const estado = avaliarAssinatura({
          plan_type: planType,
          subscription_status: status,
          subscription_end_date: endDate,
        });

        setState({
          loading: false,
          isAuthenticated: true,
          isActive: estado.gratuita || estado.paga,
          isPaid: estado.paga,
          isFree: estado.gratuita,
          isExpired: estado.bloqueada,
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
