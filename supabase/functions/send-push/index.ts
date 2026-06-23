import { createClient } from 'jsr:@supabase/supabase-js@2';
// @ts-ignore — web-push via npm
import webpush from 'npm:web-push@3.6.7';

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

    const { user_id, title, body, url } = await req.json() as {
      user_id?: string;
      title: string;
      body: string;
      url?: string;
    };

    // Busca subscriptions (de um user ou de todos)
    const query = supabase.from('push_subscriptions').select('*');
    if (user_id) query.eq('user_id', user_id);
    const { data: subscriptions, error } = await query;

    if (error) throw error;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.stringify({ title, body, url: url ?? '/' });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )
      )
    );

    // Remove subscriptions inválidas (410 Gone)
    const invalidIndexes = results
      .map((r, i) => (r.status === 'rejected' && (r.reason as any)?.statusCode === 410 ? i : -1))
      .filter((i) => i >= 0);

    if (invalidIndexes.length > 0) {
      const invalidEndpoints = invalidIndexes.map((i) => subscriptions[i].endpoint);
      await supabase.from('push_subscriptions').delete().in('endpoint', invalidEndpoints);
    }

    const sent = results.filter((r) => r.status === 'fulfilled').length;

    return new Response(JSON.stringify({ sent, total: subscriptions.length }), {
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
