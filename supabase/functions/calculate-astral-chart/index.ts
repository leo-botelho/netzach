// @ts-ignore — tz-lookup via npm: coordenadas → zona IANA, sem rede
import tzlookup from 'npm:tz-lookup@6.1.25';
import { corsHeaders, servico, erro, exigirUsuaria, exigirAdmin, segredoInternoValido } from '../_shared/auth.ts';
import { offsetNoHorarioLocal, nomeDaCidade, separarCidade, escolherResultado } from '../_shared/nascimento.ts';

/**
 * Replica o fluxo N8N supabase-netzach:
 * 1. Recebe dados de nascimento (ou payload de webhook do Supabase)
 * 2. Geocodifica cidade → lat/lon via Nominatim
 * 3. Descobre o fuso que valia no local e no dia do nascimento
 * 4. Chama freeastrologyapi.com → ascendente, solar, lunar
 * 5. Atualiza profiles com sign_sun, sign_moon, sign_rising
 *
 * Pode ser chamada:
 * - Via Database Webhook (INSERT em profiles) — substitui o N8N
 * - Diretamente do frontend (quando usuária atualiza dados de nascimento)
 */

/**
 * Diz em qual passo o cálculo falhou. Antes todo erro virava a mesma frase
 * genérica, e descobrir se era a busca da cidade, o fuso, a API de
 * astrologia ou a gravação exigia ler os logs. A etapa vai na resposta
 * (sem dados da aluna) para o painel mostrá-la à administradora.
 */
class FalhaNaEtapa extends Error {
  constructor(public etapa: string, detalhe: string) {
    super(detalhe);
  }
}

/**
 * Coordenadas da cidade, com duas fontes.
 *
 * O Nominatim é gratuito e recusa, com frequência, pedidos vindos de
 * servidores de nuvem como os do Supabase: foi o que derrubou o primeiro
 * cálculo real. Quando ele falha, o Open-Meteo responde sem chave e
 * informa o estado de cada resultado, o que permite escolher entre as
 * várias "Santa Maria" do país.
 */
async function buscarCoordenadas(cidadeBruta: string): Promise<{ lat: number; lon: number; fonte: string }> {
  const falhas: string[] = [];

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(nomeDaCidade(cidadeBruta))}&format=json&limit=1`;
    const res = await fetch(url, {
      // A política do Nominatim pede um User-Agent que identifique o app.
      headers: { 'User-Agent': 'Netzach/1.0 (+https://netzach.app.br)', 'Accept-Language': 'pt-BR' },
      signal: AbortSignal.timeout(8000),
    });
    // Quando bloqueia ou limita, ele responde HTML e não JSON.
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const dados = await res.json();
    if (Array.isArray(dados) && dados.length > 0) {
      return { lat: parseFloat(dados[0].lat), lon: parseFloat(dados[0].lon), fonte: 'nominatim' };
    }
    falhas.push('nominatim: cidade não encontrada');
  } catch (e) {
    falhas.push(`nominatim: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const { nome, uf } = separarCidade(cidadeBruta);
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nome)}&count=10&language=pt&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const dados = await res.json();
    const achado = escolherResultado(dados?.results ?? [], nome, uf);
    if (achado) return { ...achado, fonte: 'open-meteo' };
    falhas.push('open-meteo: cidade não encontrada');
  } catch (e) {
    falhas.push(`open-meteo: ${e instanceof Error ? e.message : String(e)}`);
  }

  throw new FalhaNaEtapa('busca_da_cidade', falhas.join(' | '));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });

  // Quem pode ver o motivo técnico de uma falha: a administradora e o
  // gatilho do banco. A aluna calculando o próprio mapa só vê a frase
  // amigável, porque uma mensagem de erro inesperada pode expor detalhes
  // internos.
  let podeVerDetalhe = false;

  try {
    const supabase = servico();

    const astroApiKey = Deno.env.get('FREEASTROLOGY_API_KEY')!;

    const body = await req.json();

    // ── Quem pode calcular o mapa de quem ────────────────────────
    // Antes o user_id vinha do corpo sem verificação: dava para
    // sobrescrever os signos de qualquer usuária.
    // O Database Webhook se identifica pelo segredo interno.
    const viaWebhook = segredoInternoValido(req);
    podeVerDetalhe = viaWebhook;
    let idAutenticado: string | null = null;

    let chamadaPelaAdmin = false;

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

    // A aluna só calcula o próprio mapa. A administradora pode recalcular o
    // de qualquer uma, pelo painel: foi preciso quando o fuso estava errado
    // e os mapas já gravados precisaram ser refeitos.
    if (idAutenticado && user_id !== idAutenticado) {
      const admin = await exigirAdmin(req, supabase);
      if ('resposta' in admin) return erro(req, 403, 'Só é possível calcular o próprio mapa');
      chamadaPelaAdmin = true;
      podeVerDetalhe = true;
    }

    // ── 1. Parsear data e hora (mesmo que o N8N faz) ─────────────
    const [ano, mes, dia] = birth_date.split('-').map(Number);
    const timeStr = birth_time || '12:00:00';
    const [hora, minuto] = timeStr.split(':').map(Number);

    // ── 2. Geocodificação via Nominatim ──────────────────────────
    const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cidade)}&format=json&limit=1`;
    const { lat, lon, fonte: fonteDaCidade } = await buscarCoordenadas(birth_city);

    // ── 3. Fuso do local e do dia do nascimento ──────────────────
    // Antes era `timezone: -3` para todo mundo. O Brasil teve horário de
    // verão de 1985 a 2019, e quem nasceu nesses meses tem o horário de
    // Greenwich uma hora diferente: o ascendente e a Lua saíam errados,
    // às vezes o signo inteiro. A zona vem das coordenadas (Manaus, Cuiabá
    // e o exterior não são "America/Sao_Paulo") e o deslocamento, do
    // histórico de horários daquela zona na data.
    let zona: string;
    let timezone: number;
    try {
      zona = tzlookup(lat, lon);
      timezone = offsetNoHorarioLocal(zona, ano, mes, dia, hora, minuto);
    } catch (e) {
      // Melhor sem mapa do que com um mapa silenciosamente errado.
      throw new FalhaNaEtapa('fuso', e instanceof Error ? e.message : String(e));
    }

    // ── 4. Mapa astral via freeastrologyapi.com ──────────────────
    // Tempo esgotado, rede e resposta que não é JSON também são falhas
    // desta etapa. Antes só o status HTTP era marcado, e o resto caía em
    // "passo desconhecido".
    let astroData: { output?: Array<{ zodiac_sign?: { name?: { pt?: string } } }> };
    try {
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
          timezone,
          config: {
            ayanamsha: 'tropical',
            language: 'pt',
          },
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (!astroRes.ok) {
        const errText = await astroRes.text();
        throw new Error(`HTTP ${astroRes.status}: ${errText.slice(0, 200)}`);
      }
      astroData = await astroRes.json();
    } catch (e) {
      throw new FalhaNaEtapa('api_astrologia', e instanceof Error ? `${e.name}: ${e.message}` : String(e));
    }
    const output = astroData.output;

    // output[0] = ascendente, output[1] = solar, output[2] = lunar
    const sign_rising = output?.[0]?.zodiac_sign?.name?.pt ?? null;
    const sign_sun    = output?.[1]?.zodiac_sign?.name?.pt ?? null;
    const sign_moon   = output?.[2]?.zodiac_sign?.name?.pt ?? null;

    if (!sign_sun && !sign_moon && !sign_rising) {
      throw new FalhaNaEtapa('api_astrologia', 'a resposta veio sem os signos: ' + JSON.stringify(output?.slice?.(0, 3) ?? output).slice(0, 200));
    }

    // ── 5. Atualiza perfil ───────────────────────────────────────
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ sign_sun, sign_moon, sign_rising })
      .eq('user_id', user_id);

    if (updateError) throw new FalhaNaEtapa('gravacao', updateError.message);

    return new Response(JSON.stringify({
      ok: true, sign_sun, sign_moon, sign_rising,
      // Para conferir a conta: o fuso usado e de onde ele veio.
      fuso: { zona, horas: timezone },
      coordenadas_de: fonteDaCidade,
      recalculado_pela_admin: chamadaPelaAdmin,
    }), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    const etapa = err instanceof FalhaNaEtapa ? err.etapa : 'desconhecida';
    console.error(`calculate-astral-chart [${etapa}]:`, err instanceof Error ? err.message : String(err));
    // `detalhe` é o status HTTP e o começo da resposta do serviço externo,
    // nunca dado da aluna: serve para a administradora ver o motivo no
    // painel sem depender dos logs.
    const detalhe = podeVerDetalhe && err instanceof Error ? `${err.name}: ${err.message}`.slice(0, 240) : undefined;
    return new Response(JSON.stringify({ error: 'Não foi possível calcular o mapa astral agora', etapa, detalhe }), {
      status: 500,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
