// @ts-ignore — web-push via npm
import webpush from 'npm:web-push@3.6.7';
import { corsHeaders, servico, erro, exigirAdmin, segredoInternoValido } from '../_shared/auth.ts';

/**
 * A URL do clique é restrita a caminhos internos: o service worker
 * abre `data.url` sem validar, então uma URL externa aqui viraria
 * phishing dentro do app instalado.
 */
function caminhoInterno(url: unknown): string {
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) return '/';
  return url;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    const supabase = servico();

    // ── Quem pode disparar push ──────────────────────────────────
    // Antes: ninguém era verificado. Sem user_id no corpo, a função
    // notificava toda a base com título, texto e URL arbitrários.
    if (!segredoInternoValido(req)) {
      const auth = await exigirAdmin(req, supabase);
      if ('resposta' in auth) return auth.resposta;
    }

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

    if (!title || !body) return erro(req, 400, 'title e body são obrigatórios');

    // ── Busca subscriptions (de uma usuária ou de todas) ─────────
    // Em páginas de 1000, que é o teto do PostgREST: sem isso, a partir
    // da milésima assinatura parte da base parava de receber em silêncio.
    const PAGINA = 1000;
    type Assinatura = { endpoint: string; p256dh: string; auth: string };
    const subscriptions: Assinatura[] = [];

    for (let inicio = 0; ; inicio += PAGINA) {
      let q = supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .range(inicio, inicio + PAGINA - 1);
      if (user_id) q = q.eq('user_id', user_id);

      const { data, error } = await q;
      if (error) throw error;
      if (!data || data.length === 0) break;

      subscriptions.push(...data as Assinatura[]);
      if (data.length < PAGINA) break;
    }

    if (subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.stringify({ title, body, url: caminhoInterno(url) });

    // Em lotes, para não estourar o tempo de execução da função à
    // medida que a base cresce.
    const LOTE = 100;
    const expirados: string[] = [];
    let sent = 0;

    for (let i = 0; i < subscriptions.length; i += LOTE) {
      const lote = subscriptions.slice(i, i + LOTE);
      const results = await Promise.allSettled(
        lote.map((sub) =>
          webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          )
        )
      );

      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') sent++;
        // 410 Gone / 404: assinatura morta, pode ser removida
        else if ([410, 404].includes((r.reason as { statusCode?: number })?.statusCode ?? 0)) {
          expirados.push(lote[idx].endpoint);
        }
      });
    }

    for (let i = 0; i < expirados.length; i += LOTE) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expirados.slice(i, i + LOTE));
    }

    return new Response(
      JSON.stringify({ sent, total: subscriptions.length, removidas: expirados.length }),
      { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    console.error('send-push error:', err instanceof Error ? err.message : String(err));
    return erro(req, 500, 'Falha ao enviar notificações');
  }
});
