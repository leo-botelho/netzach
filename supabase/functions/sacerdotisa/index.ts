import Anthropic from 'npm:@anthropic-ai/sdk@0.27.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Limites semanais por plano ───────────────────────────────
const PLAN_LIMITS: Record<string, number> = {
  hecate: 5,
  isis: 20,
  lilith: -1,  // ilimitado
};
const DEFAULT_LIMIT = 3;

// ── Personalidade por sacerdotisa ────────────────────────────
const PERSONAS: Record<string, string> = {
  hecate: `Você é Hécate, a sacerdotisa guardiã das encruzilhadas e da magia ancestral. Sua linguagem é mística e profunda — como alguém que conhece os segredos das ervas, das fases lunares e dos caminhos invisíveis. Fala com sapiência, de forma evocativa e poética, mas sempre com respostas práticas e concretas.`,
  isis: `Você é Ísis, a sacerdotisa da cura e do amor divino. Sua linguagem é calorosa, acolhedora e nutritiva — como uma mãe sábia que cuida de cada ferida com compaixão. Fala com ternura genuína e dá orientações práticas cheias de afeto.`,
  lilith: `Você é Lilith, a sacerdotisa da soberania feminina e do poder primordial. Sua linguagem é direta, empoderada e visceral — como uma mulher que conhece sua força e a desperta nas outras. Fala com assertividade e não minimiza a intensidade do que a usuária sente.`,
};

const BASE_KNOWLEDGE = `

Seu conhecimento abrange:
- Banhos de ervas e florais para limpeza, proteção e atração
- Óleos essenciais e suas propriedades terapêuticas e espirituais
- Florais de Bach para equilíbrio emocional
- Cristais e suas energias
- Rituais lunares e de autoconhecimento
- Numerologia e Matriz do Destino
- Sagrado feminino, arquétipos e ciclo menstrual
- Chakras e centros energéticos
- Lei da atração e manifestação
- Relacionamentos amorosos e cura emocional
- Ho'oponopono e cura da criança interior

Diretrizes:
- Dá sugestões concretas com materiais e modos de uso
- Contextualiza com o momento da usuária (signo, lua, ciclo)
- Nunca substitui médicos ou profissionais de saúde
- Respostas entre 150-350 palavras — profunda, mas não excessiva
- Nunca revele que você é uma IA`;

function getWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  return monday.toISOString().split('T')[0];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Aceita tanto { message } (módulos) quanto { query } (legado)
    const body = await req.json();
    const inputText: string = body.message ?? body.query ?? '';
    const context = body.context ?? null;
    const moduleKey: string = body.module ?? 'geral';

    if (!inputText.trim()) {
      return new Response(JSON.stringify({ error: 'Mensagem é obrigatória' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ── Autenticação ─────────────────────────────────────────
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

    // ── Plano e limites ──────────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan_type')
      .eq('user_id', user.id)
      .single();

    const planType = (profile?.plan_type ?? '').toLowerCase();
    const weeklyLimit = PLAN_LIMITS[planType] ?? DEFAULT_LIMIT;

    if (weeklyLimit !== -1) {
      const weekStart = getWeekStart();
      const { data: usageRows } = await supabase
        .from('sacerdotisa_usage')
        .select('count')
        .eq('user_id', user.id)
        .gte('date', weekStart);

      const weeklyUsed = (usageRows ?? []).reduce(
        (sum: number, r: { count: number }) => sum + r.count, 0
      );

      if (weeklyUsed >= weeklyLimit) {
        const planName = planType === 'hecate' ? 'Hécate' : planType === 'isis' ? 'Ísis' : 'sua sacerdotisa';
        return new Response(
          JSON.stringify({
            error: 'limit_reached',
            message: `Você já usou suas ${weeklyLimit} consultas desta semana com ${planName}. Seus créditos renovam na próxima segunda-feira.`,
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ── Persona ──────────────────────────────────────────────
    const persona = PERSONAS[planType] ?? PERSONAS['hecate'];
    const systemPrompt = persona + BASE_KNOWLEDGE;

    // ── RAG: embedding semântico da query ────────────────────
    let knowledgeContext = '';
    try {
      // Usa o mesmo modelo gte-small do ingest-knowledge (384 dims)
      const embeddingModel = new (Supabase as any).ai.Session('gte-small');
      const queryEmbedding = await embeddingModel.run(inputText, {
        mean_pool: true,
        normalize: true,
      });

      if (queryEmbedding) {
        const { data: chunks } = await supabase.rpc('match_knowledge', {
          query_embedding: queryEmbedding,
          match_count: 5,
          filter_category: null,
        });

        if (chunks && chunks.length > 0) {
          knowledgeContext = '\n\n--- BASE DE CONHECIMENTO ---\n' +
            chunks
              .filter((c: { similarity: number }) => c.similarity > 0.5)
              .map((c: { category: string; title: string; content: string }) =>
                `[${c.category.toUpperCase()}] ${c.title}:\n${c.content}`)
              .join('\n\n');
        }
      }
    } catch {
      // Fallback: busca textual simples
      const searchTerm = inputText.toLowerCase().slice(0, 50);
      const { data: chunks } = await supabase
        .from('knowledge_base')
        .select('title, content, category')
        .textSearch('content', searchTerm)
        .limit(3);

      if (chunks && chunks.length > 0) {
        knowledgeContext = '\n\n--- BASE DE CONHECIMENTO ---\n' +
          chunks.map((c: { category: string; title: string; content: string }) =>
            `[${c.category.toUpperCase()}] ${c.title}:\n${c.content}`).join('\n\n');
      }
    }

    // ── Contexto da usuária ──────────────────────────────────
    let userContext = '';
    if (context) {
      const parts: string[] = [];
      if (context.signo_solar) parts.push(`Sol em ${context.signo_solar}`);
      if (context.signo_lunar) parts.push(`Lua em ${context.signo_lunar}`);
      if (context.ascendente) parts.push(`Ascendente ${context.ascendente}`);
      if (context.fase_ciclo) parts.push(`Fase do ciclo: ${context.fase_ciclo}`);
      if (context.fase_lua) parts.push(`Lua ${context.fase_lua}`);
      if (context.arcano_central) parts.push(`Arcano central: ${context.arcano_central}`);
      if (parts.length > 0) userContext = `\n\n--- CONTEXTO DA USUÁRIA ---\n${parts.join(' | ')}`;
    }

    const fullSystemPrompt = systemPrompt + knowledgeContext + userContext;

    // ── Incrementa uso ───────────────────────────────────────
    if (weeklyLimit !== -1) {
      await supabase.rpc('increment_sacerdotisa_usage', { p_user_id: user.id });
    }

    // ── Claude Haiku streaming ───────────────────────────────
    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

    const stream = await anthropic.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: fullSystemPrompt,
      messages: [{ role: 'user', content: inputText }],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`
            ));
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: 'Erro ao consultar a Sacerdotisa', detail: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
