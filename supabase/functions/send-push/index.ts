import { corsHeaders, servico, erro, exigirAdmin, segredoInternoValido } from '../_shared/auth.ts';
import { enviarParaAssinaturas, type Assinatura } from '../_shared/push.ts';

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

    // Envio, lotes e limpeza de assinaturas mortas vivem em _shared/push.ts.
    const resultado = await enviarParaAssinaturas(supabase, subscriptions, { title, body, url });

    return new Response(JSON.stringify(resultado), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    console.error('send-push error:', err instanceof Error ? err.message : String(err));
    return erro(req, 500, 'Falha ao enviar notificações');
  }
});
