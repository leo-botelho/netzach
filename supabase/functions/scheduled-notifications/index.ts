import { createClient } from 'jsr:@supabase/supabase-js@2';
// @ts-ignore
import webpush from 'npm:web-push@3.6.7';

/**
 * Tipos de notificação agendada conforme documento Netzach:
 *
 * morning_checkin   — 7h (personalizável) — convite check-in matinal
 * hydration         — 10h, 14h, 16h       — lembrete de água
 * lunch_tea         — 13h                 — chá digestivo
 * evening_checkin   — 21h (personalizável)— check-in noturno
 * night_tea         — 21h30               — chá calmante
 * weekly_tarot      — sábado 9h           — tiragem pronta
 * credits_renewed   — sexta-feira         — créditos renovados
 * credits_unused    — quinta-feira        — créditos sobrando
 * lunar_phase       — na mudança de fase  — orientação da nova fase
 * monthly_retro     — dia 1 do mês        — retrospectiva pronta
 * monthly_wheel     — dia 2 do mês        — atualizar roda da vida
 */

const NOTIFICATIONS: Record<string, { title: string; body: string; url: string }> = {
  morning_checkin: {
    title: 'Bom dia, sacerdotisa ✦',
    body: 'Como você acorda hoje? Um pequeno gesto de cuidado já transforma o dia.',
    url: '/checkin',
  },
  hydration: {
    title: '💧 Hora da água',
    body: 'Seu corpo é sagrado — que tal um copo de água agora?',
    url: '/templo',
  },
  lunch_tea: {
    title: '🍵 Chá digestivo',
    body: 'Erva-doce, chá verde ou gengibre após o almoço — ayurveda para uma digestão leve.',
    url: '/templo',
  },
  evening_checkin: {
    title: 'Como foi seu dia, sacerdotisa? 🌙',
    body: 'Reserve um momento para honrar o que viveu hoje.',
    url: '/checkin',
  },
  night_tea: {
    title: '🌿 Chá noturno',
    body: 'Camomila, melissa ou maracujá — ritualize o encerramento do dia.',
    url: '/templo',
  },
  weekly_tarot: {
    title: '🃏 Sua tiragem da semana está pronta',
    body: 'As cartas têm uma mensagem especial para você esta semana.',
    url: '/templo',
  },
  credits_renewed: {
    title: '✦ Seus créditos foram renovados',
    body: 'Por onde quer começar esta semana, sacerdotisa?',
    url: '/templo',
  },
  credits_unused: {
    title: 'Você ainda tem consultas disponíveis ✦',
    body: 'Não deixe a semana passar — sua sacerdotisa está esperando.',
    url: '/sacerdotisa',
  },
  lunar_phase: {
    title: '🌕 Nova fase lunar',
    body: 'A lua mudou de fase — confira a orientação energética para este ciclo.',
    url: '/templo',
  },
  monthly_retro: {
    title: '✨ Sua jornada do mês está pronta',
    body: 'É hora de celebrar o caminho percorrido. Veja sua retrospectiva.',
    url: '/templo',
  },
  monthly_wheel: {
    title: '⭕ Atualize sua Roda da Vida',
    body: 'Novo mês, nova visão de si mesma. Quanto você cresceu?',
    url: '/templo',
  },
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const vapidEmail = Deno.env.get('VAPID_EMAIL') ?? 'mailto:admin@netzach.app';
    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

    const body = await req.json() as { type: string; override_body?: string };
    const { type, override_body } = body;

    const template = NOTIFICATIONS[type];
    if (!template) {
      return new Response(JSON.stringify({ error: `Unknown notification type: ${type}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Busca usuários que aceitam este tipo de notificação
    // Se não tiver preferência salva, envia para todos
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('user_id')
      .eq(type, true);

    const preferredUserIds = prefs?.map((p: any) => p.user_id);

    // Busca subscriptions
    let query = supabase.from('push_subscriptions').select('*');
    if (preferredUserIds && preferredUserIds.length > 0) {
      query = query.in('user_id', preferredUserIds);
    }
    const { data: subscriptions, error } = await query;

    if (error) throw error;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, type }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const notifBody = override_body || template.body;
    const payload = JSON.stringify({ title: template.title, body: notifBody, url: template.url });

    const results = await Promise.allSettled(
      subscriptions.map((sub: any) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      )
    );

    // Remove subscriptions inválidas (410 Gone)
    const invalidEndpoints = results
      .map((r, i) => r.status === 'rejected' && (r.reason as any)?.statusCode === 410 ? subscriptions[i].endpoint : null)
      .filter(Boolean);
    if (invalidEndpoints.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', invalidEndpoints);
    }

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    return new Response(JSON.stringify({ sent, total: subscriptions.length, type }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
