import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASAAS_BASE = Deno.env.get('ASAAS_ENV') === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

const ASAAS_KEY = Deno.env.get('ASAAS_API_KEY')!;

const PLAN_MAP: Record<string, { planType: string; label: string }> = {
  hecate_mensal:  { planType: 'hecate', label: 'Hécate Mensal' },
  hecate_anual:   { planType: 'hecate', label: 'Hécate Anual' },
  isis_mensal:    { planType: 'isis',   label: 'Ísis Mensal' },
  isis_anual:     { planType: 'isis',   label: 'Ísis Anual' },
  lilith_mensal:  { planType: 'lilith', label: 'Lilith Mensal' },
  lilith_anual:   { planType: 'lilith', label: 'Lilith Anual' },
};

async function asaas<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    method,
    headers: {
      'access_token': ASAAS_KEY,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Asaas ${method} ${path} → ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const {
      user_id,
      plan_id,          // ex: 'hecate_mensal'
      payment_method,   // 'CREDIT_CARD' | 'PIX'
      amount,           // em reais (ex: 29.90)
      customer,         // { name, email, cpfCnpj, phone }
      card,             // { holderName, number, expiryMonth, expiryYear, ccv }
    } = await req.json();

    if (!user_id || !plan_id || !payment_method || !amount || !customer) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios ausentes' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const planMeta = PLAN_MAP[plan_id];
    if (!planMeta) {
      return new Response(JSON.stringify({ error: `Plano inválido: ${plan_id}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 1. Criar/buscar cliente no Asaas ────────────────────────
    let asaasCustomerId: string;
    const existingCustomers = await asaas<{ data: Array<{ id: string }> }>(
      `/customers?email=${encodeURIComponent(customer.email)}&limit=1`
    );

    if (existingCustomers.data?.length > 0) {
      asaasCustomerId = existingCustomers.data[0].id;
    } else {
      const created = await asaas<{ id: string }>('/customers', 'POST', {
        name: customer.name,
        email: customer.email,
        cpfCnpj: customer.cpfCnpj?.replace(/\D/g, ''),
        phone: customer.phone?.replace(/\D/g, ''),
        notificationDisabled: false,
      });
      asaasCustomerId = created.id;
    }

    // ── 2. Criar assinatura ou cobrança avulsa ───────────────────
    const isAnual = plan_id.includes('anual');
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    let paymentResult: Record<string, unknown>;

    if (payment_method === 'PIX') {
      // PIX: cobrança avulsa (o recorrente via PIX no Asaas precisa de confirmação manual)
      const charge = await asaas<{ id: string; status: string }>('/payments', 'POST', {
        customer: asaasCustomerId,
        billingType: 'PIX',
        value: amount,
        dueDate: dueDateStr,
        description: `Netzach — ${planMeta.label}`,
        externalReference: `${user_id}|${plan_id}`,
      });

      const pixData = await asaas<{ encodedImage: string; payload: string }>(
        `/payments/${charge.id}/pixQrCode`
      );

      paymentResult = {
        method: 'pix',
        payment_id: charge.id,
        qr_code_base64: `data:image/png;base64,${pixData.encodedImage}`,
        copy_paste: pixData.payload,
        status: charge.status,
      };

    } else {
      // Cartão: assinatura recorrente
      const cycle = isAnual ? 'YEARLY' : 'MONTHLY';
      const sub = await asaas<{ id: string; status: string; creditCard?: unknown }>(
        '/subscriptions', 'POST', {
          customer: asaasCustomerId,
          billingType: 'CREDIT_CARD',
          value: amount,
          nextDueDate: dueDateStr,
          cycle,
          description: `Netzach — ${planMeta.label}`,
          externalReference: `${user_id}|${plan_id}`,
          creditCard: {
            holderName: card.holderName,
            number: card.number.replace(/\s/g, ''),
            expiryMonth: card.expiryMonth,
            expiryYear: card.expiryYear,
            ccv: card.ccv,
          },
          creditCardHolderInfo: {
            name: customer.name,
            email: customer.email,
            cpfCnpj: customer.cpfCnpj?.replace(/\D/g, ''),
            phone: customer.phone?.replace(/\D/g, ''),
          },
        }
      );

      // Cartão aprovado imediatamente → ativa assinatura
      if (sub.status === 'ACTIVE' || sub.status === 'CONFIRMED') {
        await activateSubscription(supabase, user_id, planMeta.planType, plan_id, sub.id);
      }

      paymentResult = {
        method: 'credit_card',
        subscription_id: sub.id,
        status: sub.status,
        approved: sub.status === 'ACTIVE' || sub.status === 'CONFIRMED',
      };
    }

    return new Response(JSON.stringify(paymentResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('asaas-checkout error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function activateSubscription(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  planType: string,
  planId: string,
  subscriptionId: string
) {
  const isAnual = planId.includes('anual');
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + (isAnual ? 12 : 1));

  await supabase.from('profiles').update({
    subscription_status: 'active',
    plan_type: planType,
    subscription_end_date: endDate.toISOString().split('T')[0],
    last_payment_method: planId.includes('anual') ? 'credit_card_annual' : 'credit_card_monthly',
  }).eq('user_id', userId);
}
