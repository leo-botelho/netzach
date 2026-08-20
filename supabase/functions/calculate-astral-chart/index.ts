import { corsHeaders, servico, erro, exigirUsuaria, segredoInternoValido } from '../_shared/auth.ts';

/**
 * Replica o fluxo N8N supabase-netzach:
 * 1. Recebe dados de nascimento (ou payload de webhook do Supabase)
 * 2. Geocodifica cidade → lat/lon via Nominatim
 * 3. Chama freeastrologyapi.com → ascendente, solar, lunar
 * 4. Atualiza profiles com sign_sun, sign_moon, sign_rising
 *
 * Pode ser chamada:
 * - Via Database Webhook (INSERT em profiles) — substitui o N8N
 * - Diretamente do frontend (quando usuária atualiza dados de nascimento)
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });

  try {
    const supabase = servico();

    const astroApiKey = Deno.env.get('FREEASTROLOGY_API_KEY')!;

    const body = await req.json();

    // ── Quem pode calcular o mapa de quem ────────────────────────
    // Antes o user_id vinha do corpo sem verificação: dava para
    // sobrescrever os signos de qualquer usuária.
    // O Database Webhook se identifica pelo segredo interno.
    const viaWebhook = segredoInternoValido(req);
    let idAutenticado: string | null = null;

    if (!viaWebhook) {
      const auth = await exigirUsuaria(req, supabase);
      if ('resposta' in auth) return auth.resposta;
      idAutenticado = auth.usuaria.id;
    }

    // Suporte a dois formatos de entrada:
    // 1. Database Webhook: { type: 'INSERT', record: { user_id, birth_date, birth_time, birth_city } }
    // 2. Chamada direta:   { user_id, birth_date, birth_time, birth_city }
    let record: Record<string, string>;
    if (body.type === 'INSERT' && body.record) {
      if (body.type !== 'INSERT') {
        return new Response(JSON.stringify({ skipped: 'not INSERT' }), {
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }
      record = body.record;
    } else {
      record = body;
    }

    const { user_id, birth_date, birth_time, birth_city } = record;

    if (!user_id || !birth_date || !birth_city) {
      return erro(req, 400, 'user_id, birth_date e birth_city são obrigatórios');
    }

    if (idAutenticado && user_id !== idAutenticado) {
      return erro(req, 403, 'Só é possível calcular o próprio mapa');
    }

    // ── 1. Parsear data e hora (mesmo que o N8N faz) ─────────────
    const [ano, mes, dia] = birth_date.split('-').map(Number);
    const timeStr = birth_time || '12:00:00';
    const [hora, minuto] = timeStr.split(':').map(Number);

    // Cidade: pega só antes do " - " (ex: "Rio de Janeiro - RJ" → "Rio de Janeiro")
    const cidade = birth_city.split('-')[0].trim();

    // ── 2. Geocodificação via Nominatim ──────────────────────────
    const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cidade)}&format=json&limit=1`;
    const geoRes = await fetch(geoUrl, {
      headers: { 'User-Agent': 'NetzachApp/1.0' },
    });
    const geoData = await geoRes.json();

    if (!geoData || geoData.length === 0) {
      return erro(req, 422, `Cidade não encontrada: ${cidade}`);
    }

    const lat = parseFloat(geoData[0].lat);
    const lon = parseFloat(geoData[0].lon);

    // ── 3. Mapa astral via freeastrologyapi.com ──────────────────
    const astroRes = await fetch('https://json.freeastrologyapi.com/western/planets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': astroApiKey,
      },
      body: JSON.stringify({
        year: ano,
        month: mes,
        date: dia,
        hours: hora,
        minutes: minuto,
        seconds: 0,
        latitude: lat,
        longitude: lon,
        timezone: -3,
        config: {
          ayanamsha: 'tropical',
          language: 'pt',
        },
      }),
    });

    if (!astroRes.ok) {
      const errText = await astroRes.text();
      throw new Error(`freeastrologyapi error ${astroRes.status}: ${errText}`);
    }

    const astroData = await astroRes.json();
    const output = astroData.output;

    // output[0] = ascendente, output[1] = solar, output[2] = lunar
    const sign_rising = output?.[0]?.zodiac_sign?.name?.pt ?? null;
    const sign_sun    = output?.[1]?.zodiac_sign?.name?.pt ?? null;
    const sign_moon   = output?.[2]?.zodiac_sign?.name?.pt ?? null;

    if (!sign_sun && !sign_moon && !sign_rising) {
      throw new Error('API retornou dados incompletos: ' + JSON.stringify(output?.slice(0, 3)));
    }

    // ── 4. Atualiza perfil ───────────────────────────────────────
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ sign_sun, sign_moon, sign_rising })
      .eq('user_id', user_id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ ok: true, sign_sun, sign_moon, sign_rising }), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    console.error('calculate-astral-chart error:', err instanceof Error ? err.message : String(err));
    return erro(req, 500, 'Não foi possível calcular o mapa astral agora');
  }
});
