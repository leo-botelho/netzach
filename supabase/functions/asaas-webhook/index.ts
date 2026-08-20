import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Webhook Asaas → libera e bloqueia o acesso conforme os pagamentos.
 *
 * Cadastrar no painel do Asaas em Integrações > Webhooks, com o token
 * de ASAAS_WEBHOOK_TOKEN. Sem ele, o PIX nunca libera acesso e a
 * renovação do cartão não estende a validade.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
};

const ASAAS_BASE = Deno.env.get('ASAAS_ENV') === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

/**
 * Confirma na API do Asaas que a cobrança está mesmo paga.
 * Sem isso, um POST forjado com o payload certo ativaria a assinatura.
 */
async function pagamentoConfirmadoNaOrigem(paymentId: string): Promise<boolean> {
  const key = Deno.env.get('ASAAS_API_KEY');
  if (!key) throw new Error('ASAAS_API_KEY não configurado');

  const res = await fetch(`${ASAAS_BASE}/payments/${paymentId}`, {
    headers: { 'access_token': key },
  });
  if (!res.ok) return false;

  const pagamento = await res.json();
  return ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'].includes(pagamento?.status);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // ── Token obrigatório ────────────────────────────────────────
    // Antes a checagem era `if (expectedToken && ...)`: sem o secret
    // configurado ela desaparecia e o endpoint ficava aberto.
    const webhookToken = req.headers.get('asaas-access-token');
    const expectedToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN');
    if (!expectedToken) {
      console.error('ASAAS_WEBHOOK_TOKEN ausente nos secrets — webhook recusado');
      return new Response('Webhook não configurado', { status: 503 });
    }
    if (webhookToken !== expectedToken) {
      return new Response('Unauthorized', { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const payload = await req.json();
    const { event, payment, subscription } = payload;

    // ── Idempotência ─────────────────────────────────────────────
    // O Asaas reentrega eventos. Sem esta trava, cada reentrega
    // reativava a assinatura e reenviava o push.
    const eventId: string = payload?.id
      ?? `${event}:${payment?.id ?? subscription?.id ?? 'sem-id'}`;

    const { error: dupError } = await supabase
      .from('webhook_events')
      .insert({ event_id: eventId, event_type: event, payload });

    if (dupError) {
      // 23505 = violação de chave primária: já processamos este evento.
      if (dupError.code === '23505') {
        return new Response(JSON.stringify({ ok: true, duplicado: eventId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Falha ao registrar evento: ${dupError.message}`);
    }

    /**
     * Nomes conferidos um a um com o painel do Asaas em 19/08/2026.
     *
     * Três dos que estavam no código não existem: SUBSCRIPTION_ACTIVATED,
     * SUBSCRIPTION_RENEWED e PAYMENT_CHARGEBACK (o real é
     * PAYMENT_CHARGEBACK_REQUESTED). O de inativação chama-se
     * SUBSCRIPTION_INACTIVATED, não DEACTIVATED.
     *
     * Quem libera acesso é sempre um evento de cobrança: no Asaas a
     * assinatura gera cobranças, e é o pagamento delas que confirma.
     * Vale para a primeira compra e para cada renovação, PIX ou cartão.
     */
    const CONFIRM_EVENTS = [
      'PAYMENT_CONFIRMED',   // pago; saldo ainda não disponível
      'PAYMENT_RECEIVED',    // recebido de fato
    ];

    const BLOCK_EVENTS = [
      'PAYMENT_OVERDUE',                     // venceu sem pagar
      'PAYMENT_DELETED',                     // cobrança removida
      'PAYMENT_REFUNDED',                    // estornada
      'PAYMENT_CHARGEBACK_REQUESTED',        // cliente contestou
      'PAYMENT_CHARGEBACK_DISPUTE',          // contestação em disputa
      'PAYMENT_RECEIVED_IN_CASH_UNDONE',     // recebimento desfeito
      'PAYMENT_REPROVED_BY_RISK_ANALYSIS',   // cartão reprovado na análise
      'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED', // captura recusada
      'SUBSCRIPTION_INACTIVATED',
      'SUBSCRIPTION_DELETED',
    ];

    /**
     * Ficam de fora de propósito, por não terem resposta óbvia:
     *
     * PAYMENT_AWAITING_CHARGEBACK_REVERSAL — a disputa foi ganha e o
     *   valor volta para a conta. Não deve bloquear; restaurar sozinho
     *   também não, porque o acesso pode já ter sido reativado à mão.
     * PAYMENT_PARTIALLY_REFUNDED — estorno parcial não diz se a
     *   assinatura continua valendo. É decisão de produto.
     * PAYMENT_RESTORED e PAYMENT_REFUND_DENIED — devolvem a cobrança ao
     *   estado válido, mas reativar acesso automaticamente a partir
     *   deles seria supor demais.
     *
     * Os informativos (CREATED, UPDATED, ANTICIPATED, os *_VIEWED, os
     * de negativação e os de split) chegam, são respondidos e ignorados.
     */

    const isConfirm = CONFIRM_EVENTS.includes(event);
    const isBlock = BLOCK_EVENTS.includes(event);

    if (!isConfirm && !isBlock) {
      return new Response(JSON.stringify({ ignored: event }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // externalReference = "user_id|plan_id" (definido no asaas-checkout)
    const externalRef: string = payment?.externalReference || subscription?.externalReference || '';
    const [userId, planId] = externalRef.split('|');

    if (!userId || !planId) {
      return new Response(JSON.stringify({ error: 'externalReference inválido', ref: externalRef }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('webhook_events').update({ user_id: userId }).eq('event_id', eventId);

    // ── Bloquear acesso (inadimplência / cancelamento) ────────────
    if (isBlock) {
      await supabase.from('profiles').update({
        subscription_status: event === 'PAYMENT_OVERDUE' ? 'overdue' : 'inactive',
      }).eq('user_id', userId);

      await supabase.functions.invoke('send-push', {
        headers: { 'x-internal-secret': Deno.env.get('INTERNAL_TASK_SECRET') ?? '' },
        body: {
          user_id: userId,
          title: '⚠️ Pagamento pendente',
          body: 'Renove sua assinatura para continuar acessando o Netzach.',
          url: '/assinar',
        },
      });

      return new Response(JSON.stringify({ ok: true, action: 'blocked', userId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Ativar assinatura ─────────────────────────────────────────
    // Só depois de confirmar com o Asaas que a cobrança existe e está
    // paga. Eventos de assinatura (sem payment.id) já vêm autenticados
    // pelo token e não têm cobrança avulsa para consultar.
    if (payment?.id && !(await pagamentoConfirmadoNaOrigem(payment.id))) {
      console.error('Evento recebido mas pagamento não confirmado na origem:', payment.id);
      // Libera o registro de idempotência: este evento não foi
      // processado, e o Asaas pode reentregá-lo quando a cobrança
      // realmente confirmar.
      await supabase.from('webhook_events').delete().eq('event_id', eventId);
      return new Response(
        JSON.stringify({ error: 'pagamento_nao_confirmado', payment_id: payment.id }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const planType = planId.startsWith('hecate') ? 'hecate'
      : planId.startsWith('isis') ? 'isis'
      : planId.startsWith('lilith') ? 'lilith'
      : 'hecate';

    const isAnual = planId.includes('anual');
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (isAnual ? 12 : 1));

    // O Asaas não emite evento de renovação: toda cobrança paga chega
    // como PAYMENT_CONFIRMED ou PAYMENT_RECEIVED, seja a primeira ou a
    // décima. A diferença está no estado anterior do perfil.
    const { data: perfilAntes } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('user_id', userId)
      .maybeSingle();

    const ehRenovacao = perfilAntes?.subscription_status === 'active';

    await supabase.from('profiles').update({
      subscription_status: 'active',
      plan_type: planType,
      subscription_end_date: endDate.toISOString().split('T')[0],
      last_payment_method: payment?.billingType?.toLowerCase() || 'pix',
    }).eq('user_id', userId);

    const planLabels: Record<string, string> = {
      hecate: 'Hécate', isis: 'Ísis', lilith: 'Lilith',
    };

    // Renovação em dia não precisa de aviso: a assinante não fez nada
    // e receber "bem-vinda ao plano" todo mês seria estranho.
    if (!ehRenovacao) {
      await supabase.functions.invoke('send-push', {
        headers: { 'x-internal-secret': Deno.env.get('INTERNAL_TASK_SECRET') ?? '' },
        body: {
          user_id: userId,
          title: `✦ Bem-vinda ao plano ${planLabels[planType]}`,
          body: 'Sua jornada começa agora. O Templo está aberto para você.',
          url: '/templo',
        },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, action: ehRenovacao ? 'renewed' : 'activated', userId, planType }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    console.error('asaas-webhook error:', err instanceof Error ? err.message : String(err));
    return new Response(JSON.stringify({ error: 'Falha ao processar o evento' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
