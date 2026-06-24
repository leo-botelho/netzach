import { createClient } from 'jsr:@supabase/supabase-js@2';

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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const astroApiKey = Deno.env.get('FREEASTROLOGY_API_KEY')!;

    const body = await req.json();

    // Suporte a dois formatos de entrada:
    // 1. Database Webhook: { type: 'INSERT', record: { user_id, birth_date, birth_time, birth_city } }
    // 2. Chamada direta:   { user_id, birth_date, birth_time, birth_city }
    let record: Record<string, string>;
    if (body.type === 'INSERT' && body.record) {
      if (body.type !== 'INSERT') {
        return new Response(JSON.stringify({ skipped: 'not INSERT' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      record = body.record;
    } else {
      record = body;
    }

    const { user_id, birth_date, birth_time, birth_city } = record;

    if (!user_id || !birth_date || !birth_city) {
      return new Response(JSON.stringify({ error: 'user_id, birth_date e birth_city são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      return new Response(JSON.stringify({ error: `Cidade não encontrada: ${cidade}` }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('calculate-astral-chart error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
