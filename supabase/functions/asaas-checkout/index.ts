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

/**
 * Erro que pode ser mostrado à usuária: recusa de cartão, CPF inválido,
 * o que o Asaas devolve como 400. Tudo que não for isso vira mensagem
 * genérica, para não expor configuração interna na tela.
 */
class ErroDeNegocio extends Error {}

async function asaas<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  if (!ASAAS_KEY) throw new Error('ASAAS_API_KEY não configurado nos secrets da Edge Function');

  const res = await fetch(`${ASAAS_BASE}${path}`, {
    method,
    headers: {
      'access_token': ASAAS_KEY,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();

  if (!res.ok) {
    let detail = text;
    let temDescricao = false;
    try {
      const parsed = JSON.parse(text);
      // Asaas retorna { errors: [{ code, description }] }
      if (parsed.errors?.length) {
        detail = parsed.errors.map((e: { description: string }) => e.description).join(' | ');
        temDescricao = true;
      }
    } catch { /* usa o text bruto */ }

    if (res.status === 400 && temDescricao) throw new ErroDeNegocio(detail);
    throw new Error(`Asaas ${method} ${path} → HTTP ${res.status}: ${detail}`);
  }

  return JSON.parse(text) as T;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const {
      plan_id,          // ex: 'hecate_mensal'
      payment_method,   // 'CREDIT_CARD' | 'PIX'
      customer,         // { name, email, cpfCnpj, phone }
      card,             // { holderName, number, expiryMonth, expiryYear, ccv }
    } = await req.json();

    // ── Quem está comprando vem do token, nunca do corpo ─────────
    // Antes o user_id chegava pelo body: qualquer pessoa podia ativar
    // assinatura em nome de outra.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Autenticação necessária' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const user_id = user.id;

    if (!plan_id || !payment_method || !customer) {
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

    // ── O preço é do banco, não do cliente ───────────────────────
    // Antes o valor cobrado vinha no corpo da requisição: dava para
    // pedir o plano anual e mandar amount = 0.01.
    const { data: planConfig, error: planError } = await supabase
      .from('plan_configs')
      .select('price, active')
      .eq('id', plan_id)
      .maybeSingle();

    if (planError) throw new Error(`Falha ao ler plan_configs: ${planError.message}`);
    if (!planConfig || !planConfig.active) {
      return new Response(JSON.stringify({ error: `Plano indisponível: ${plan_id}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const amount = Number(planConfig.price);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(`Preço inválido cadastrado para ${plan_id}`);
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
        notificationDisabled: true,
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
        notificationDisabled: true,
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
          notificationDisabled: true,
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

    // Recusa de cartão e afins a usuária precisa ler; falha de
    // configuração, não. O detalhe fica no log da função.
    const ehDeNegocio = err instanceof ErroDeNegocio;
    return new Response(
      JSON.stringify({
        error: ehDeNegocio
          ? message
          : 'Não foi possível concluir o pagamento agora. Tente novamente em instantes.',
      }),
      {
        status: ehDeNegocio ? 400 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
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
