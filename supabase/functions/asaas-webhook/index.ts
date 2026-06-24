import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Webhook Asaas → confirma pagamento PIX e ativa assinatura.
 * Registrar no painel Asaas: Settings > Webhooks > URL desta função.
 * Eventos relevantes: PAYMENT_CONFIRMED, PAYMENT_RECEIVED, SUBSCRIPTION_ACTIVATED
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Validação simples de token (Asaas envia header asaas-access-token)
    const webhookToken = req.headers.get('asaas-access-token');
    const expectedToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN');
    if (expectedToken && webhookToken !== expectedToken) {
      return new Response('Unauthorized', { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const payload = await req.json();
    const { event, payment, subscription } = payload;

    // Eventos que ativam assinatura
    const CONFIRM_EVENTS = [
      'PAYMENT_CONFIRMED',
      'PAYMENT_RECEIVED',
      'SUBSCRIPTION_ACTIVATED',
      'SUBSCRIPTION_RENEWED',
    ];

    // Eventos que bloqueiam acesso
    const BLOCK_EVENTS = [
      'PAYMENT_OVERDUE',
      'PAYMENT_DELETED',
      'PAYMENT_REFUNDED',
      'PAYMENT_CHARGEBACK',
      'SUBSCRIPTION_DELETED',
      'SUBSCRIPTION_DEACTIVATED',
    ];

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

    // ── Bloquear acesso (inadimplência / cancelamento) ────────────
    if (isBlock) {
      await supabase.from('profiles').update({
        subscription_status: event === 'PAYMENT_OVERDUE' ? 'overdue' : 'inactive',
      }).eq('user_id', userId);

      await supabase.functions.invoke('send-push', {
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
    const planType = planId.startsWith('hecate') ? 'hecate'
      : planId.startsWith('isis') ? 'isis'
      : planId.startsWith('lilith') ? 'lilith'
      : 'hecate';

    const isAnual = planId.includes('anual');
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (isAnual ? 12 : 1));

    await supabase.from('profiles').update({
      subscription_status: 'active',
      plan_type: planType,
      subscription_end_date: endDate.toISOString().split('T')[0],
      last_payment_method: payment?.billingType?.toLowerCase() || 'pix',
    }).eq('user_id', userId);

    const planLabels: Record<string, string> = {
      hecate: 'Hécate', isis: 'Ísis', lilith: 'Lilith',
    };

    // Notifica apenas na ativação inicial ou renovação
    if (['SUBSCRIPTION_ACTIVATED', 'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(event)) {
      await supabase.functions.invoke('send-push', {
        body: {
          user_id: userId,
          title: `✦ ${event.includes('RENEW') ? 'Assinatura renovada' : 'Bem-vinda ao plano'} ${planLabels[planType]}`,
          body: event.includes('RENEW')
            ? 'Sua jornada continua. O Templo está aberto para você.'
            : 'Sua jornada começa agora. O Templo está aberto para você.',
          url: '/templo',
        },
      });
    }

    return new Response(JSON.stringify({ ok: true, action: 'activated', userId, planType }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('asaas-webhook error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
