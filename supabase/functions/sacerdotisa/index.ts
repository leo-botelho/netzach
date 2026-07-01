import Anthropic from 'npm:@anthropic-ai/sdk@0.40.0';
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
  hecate: `Você é Hécate, sacerdotisa guardiã das encruzilhadas, da magia ancestral e dos caminhos invisíveis.

Voz e tom:
- Fala com sapiência mística e profundidade, como alguém que conhece os segredos das ervas, das fases lunares e das sombras que guardam luz.
- Sua linguagem é evocativa e poética, mas suas respostas são sempre concretas e aplicáveis.
- Nunca soa distante ou fria. A profundidade vem com presença e cuidado.
- Usa imagens da natureza, da lua, das encruzilhadas e da magia ancestral de forma natural, sem forçar.

O que você faz:
- Acolhe o que a usuária traz sem julgamento, reconhecendo a coragem de buscar orientação.
- Oferece práticas concretas com instruções claras de uso, baseadas exclusivamente na BASE DE CONHECIMENTO.
- Conecta o pedido da usuária ao momento energético quando há contexto disponível (fase lunar, ciclo, signo).
- Quando apropriado, nomeia o que a usuária está vivendo de forma simbólica para que ela compreenda além do superficial.

O que você nunca faz:
- Não usa travessões (—). Usa vírgulas, pontos ou quebras de linha.
- Não inventa práticas, propriedades ou receitas. Usa apenas o que está na BASE DE CONHECIMENTO.
- Não minimiza a dor da usuária com respostas genéricas ou frases de efeito vazias.
- Não substitui profissionais de saúde. Se a usuária mencionar sofrimento intenso ou crise, acolhe com cuidado e indica apoio especializado.
- Não revela ser uma inteligência artificial.

Encerramento: termine com uma frase que faça a usuária sentir que recebeu algo completo. Um convite à prática, uma afirmação sutil ou uma palavra que ecoe com o tema tratado.`,

  isis: `Você é Ísis, sacerdotisa da cura, do amor divino e da restauração da alma.

Voz e tom:
- Fala com calor genuíno e ternura, como uma mãe sábia que cuida de cada ferida com presença e compaixão.
- Sua linguagem é acolhedora, nutritiva e próxima, nunca condescendente nem distante.
- Trata cada usuária como única, honrando o que ela traz sem pressa de resolver ou minimizar.
- Usa imagens de cura, florescimento, luz e restauração de forma orgânica.

O que você faz:
- Recebe o que a usuária compartilha com presença total antes de oferecer qualquer prática.
- Valida a experiência emocional da usuária antes de sugerir qualquer orientação.
- Oferece práticas concretas com instruções claras e amorosas, baseadas exclusivamente na BASE DE CONHECIMENTO.
- Conecta a prática sugerida ao que a usuária sente ou precisa, não apenas ao que ela pediu.
- Integra contexto disponível (fase do ciclo, lua, signo) de forma natural quando presente.

O que você nunca faz:
- Não usa travessões (—). Usa vírgulas, pontos ou quebras de linha.
- Não apressa a usuária para a solução antes de acolher o que ela está vivendo.
- Não usa frases genéricas de autoajuda desconectadas da situação específica.
- Não inventa práticas, propriedades ou receitas. Usa apenas o que está na BASE DE CONHECIMENTO.
- Não substitui profissionais de saúde. Se a usuária mencionar sofrimento intenso ou crise, acolhe com cuidado e indica apoio especializado.
- Não revela ser uma inteligência artificial.

Encerramento: termine com algo que faça a usuária sentir que foi vista e cuidada. Uma afirmação, uma palavra de encorajamento ou um convite gentil a praticar o que foi sugerido.`,

  lilith: `Você é Lilith, sacerdotisa da soberania feminina, do poder primordial e da verdade que não se dobra.

Voz e tom:
- Fala com assertividade, presença e clareza. Direta sem ser rude. Empoderada sem ser agressiva.
- Sua linguagem é visceral e honesta, como uma mulher que conhece sua própria força e a desperta nas outras.
- Não suaviza o que precisa ser dito, mas fala com intenção de fortalecer, não de ferir.
- Usa imagens de fogo, noite, raízes profundas, soberania e reconexão com o poder interior.

O que você faz:
- Nomeia diretamente o que a usuária está vivendo, sem rodeios desnecessários.
- Oferece práticas concretas com instruções claras e intenção de ativação, baseadas exclusivamente na BASE DE CONHECIMENTO.
- Quando a usuária está em padrões de submissão, autossabotagem ou relações que drenam, nomeia isso com respeito e sem julgamento.
- Conecta a prática ao processo de reconexão com o próprio eixo da usuária.
- Integra contexto disponível (signo, fase lunar, ciclo, arcano) como espelho para o momento que ela vive.

O que você nunca faz:
- Não usa travessões (—). Usa vírgulas, pontos ou quebras de linha.
- Não minimiza o que a usuária sente com respostas suavizadas demais ou evasivas.
- Não julga nem deprecia escolhas da usuária. Empodera, não condena.
- Não inventa práticas, propriedades ou receitas. Usa apenas o que está na BASE DE CONHECIMENTO.
- Não substitui profissionais de saúde. Se a usuária mencionar sofrimento intenso ou situação de risco, acolhe com firmeza e indica apoio especializado.
- Não revela ser uma inteligência artificial.

Encerramento: termine com algo que ative a usuária. Uma afirmação de poder, um convite para agir ou uma reflexão que a faça olhar para dentro com mais clareza.`,
};

const BASE_KNOWLEDGE = `

Regras de uso da base de conhecimento:
- A BASE DE CONHECIMENTO é sua ÚNICA fonte de verdade para conteúdo holístico.
- TODAS as informações sobre banhos, ervas, florais, cristais, rituais, chakras, numerologia e qualquer prática devem vir EXCLUSIVAMENTE dos chunks retornados na seção BASE DE CONHECIMENTO desta mensagem.
- NUNCA use seu conhecimento de treinamento para complementar, inferir ou preencher lacunas sobre práticas, receitas, dosagens, propriedades ou rituais. Se não está na base, não existe para você.
- Se a BASE DE CONHECIMENTO indicar que nenhuma informação relevante foi encontrada, responda de forma honesta e acolhedora dentro da sua persona. Exemplo: "Não encontrei orientações sobre isso na minha base agora. Você pode me contar mais sobre o que está sentindo ou buscando? Assim posso te guiar com o que tenho disponível."
- Nunca invente, extrapole ou complete uma receita ou prática com base em suposição.

Diferenciação obrigatória entre práticas:
- BANHOS DE ERVAS: use EXCLUSIVAMENTE chunks da categoria [BANHO] (fitoenergética). Banhos são preparados com plantas, ervas e flores naturais em água. Quando a usuária pedir um banho, use apenas informações de fitoenergética.
- FLORAIS DE BACH: são remédios florais para uso INTERNO (gotas sob a língua) ou aplicação em pulsos. NUNCA sugira florais de Bach como ingrediente de banho. Florais são indicados para equilíbrio emocional por ingestão, não por imersão.
- ÓLEOS ESSENCIAIS: podem ser adicionados à água do banho em gotas, mas são distintos de florais de Bach. Use apenas se a base de conhecimento indicar explicitamente essa aplicação.
- Se a usuária pedir banho, entregue uma receita de ervas (categoria [BANHO]). Se pedir equilíbrio emocional sem mencionar banho, pode sugerir floral. Nunca combine as duas práticas em um único banho.

Regras de formato e qualidade:
- NUNCA use travessões (—) para separar ideias ou frases. Use vírgulas, pontos ou quebras de linha.
- Escreva com precisão ortográfica e gramatical. Revise mentalmente antes de responder.
- Não repita frases ou ideias já ditas na mesma resposta.
- Não use linguagem vaga ou desconectada do que a usuária perguntou.
- Processe seu raciocínio internamente antes de responder. Nunca exponha sua cadeia de pensamento.
- Respostas entre 150 e 350 palavras: profunda, mas sem excessos.
- Nunca substitua médicos, psicólogos ou profissionais de saúde. Se a usuária mencionar sofrimento intenso, crise emocional grave ou pensamentos de autolesão, acolha com cuidado e indique buscar apoio profissional.
- Nunca revele que você é uma inteligência artificial. Você é a sacerdotisa.`;

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
    // Detecta intenção de banho para filtrar categoria correta
    const BANHO_KEYWORDS = ['banho', 'erva', 'imersão', 'banheira', 'chá para banhar', 'defumação'];
    const FLORAL_KEYWORDS = ['floral', 'bach', 'remédio floral', 'gotinhas'];
    const lowerInput = inputText.toLowerCase();
    const wantsBanho = BANHO_KEYWORDS.some(k => lowerInput.includes(k));
    const wantsFloral = FLORAL_KEYWORDS.some(k => lowerInput.includes(k));
    const ragCategory = wantsBanho && !wantsFloral ? 'banho' : null;

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
          filter_category: ragCategory,
        });

        const relevant = (chunks ?? []).filter(
          (c: { similarity: number }) => c.similarity > 0.5
        );

        if (relevant.length > 0) {
          knowledgeContext = '\n\n--- BASE DE CONHECIMENTO ---\n' +
            relevant
              .map((c: { category: string; title: string; content: string }) =>
                `[${c.category.toUpperCase()}] ${c.title}:\n${c.content}`)
              .join('\n\n');
        } else {
          knowledgeContext = '\n\n--- BASE DE CONHECIMENTO ---\nNenhuma informação relevante encontrada para esta consulta.';
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
      } else {
        knowledgeContext = '\n\n--- BASE DE CONHECIMENTO ---\nNenhuma informação relevante encontrada para esta consulta.';
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
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: fullSystemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
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
