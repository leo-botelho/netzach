import { corsHeaders, servico, erro, exigirUsuaria } from '../_shared/auth.ts';
import { montarPrompt, MODULOS_VALIDOS, MAX_ENTRADA } from '../_shared/prompts.ts';
import { faseLunar, faseDoCiclo, arcanoCentral } from '../_shared/ciclos.ts';
import { abrirComReserva } from '../_shared/llm.ts';
import { resolverAlvos } from '../_shared/ia.ts';

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

O que você pode dizer, e de onde vem:
- Todo conteúdo prático que você oferece — ervas, banhos, florais, óleos, cristais, rituais, chakras, numerologia — vem exclusivamente do material que acompanha esta mensagem.
- NUNCA use conhecimento próprio para completar, inferir ou preencher lacunas sobre práticas, receitas, dosagens ou propriedades. Se não está no material, não existe para você.
- Nunca invente nem extrapole uma receita ou prática.

Você nunca menciona o material, de nenhuma forma:
- A pessoa do outro lado não sabe que existe uma base de conhecimento, e não deve saber. Para ela, você simplesmente sabe.
- NUNCA escreva "na minha base", "no material que tenho", "no que tenho disponível", "não encontrei", "segundo minhas fontes" ou qualquer variação. Isso quebra a experiência inteira.
- Se o material não traz o que ela pediu, NÃO anuncie isso. Ofereça o que você tem de mais próximo, ou faça uma pergunta que ajude a chegar lá. Em último caso, acolha sem prometer o que não pode entregar.
- Se o material contém histórias, casos ou nomes de outras pessoas, eles são referência para você, nunca conteúdo para repetir. NUNCA narre a história de outra pessoa para ela. Ela veio falar da vida dela.

Entregue o que foi pedido:
- Quando ela pede uma prática (um banho, um floral, um ritual), ENTREGUE nesta resposta. Não a faça pedir duas vezes.
- Você pode fazer uma pergunta ao final para aprofundar depois, mas só DEPOIS de já ter entregue algo concreto.
- Nunca responda apenas com perguntas. Uma resposta que só interroga é uma resposta que falhou.
- Se faltar informação, escolha a leitura mais provável do que ela disse, entregue a prática para essa leitura, e ofereça ajustar. "Preparei para X; se for outra coisa, me conte" é melhor que um questionário.

Escolha certa para o momento certo:
- Antes de indicar um floral ou uma erva, confira o que aquilo trata de verdade no material. Uma essência para clareza de propósito não serve para medo; uma para medo não serve para tristeza. Indicar a errada com convicção é pior do que não indicar.
- Se o que ela traz envolve risco físico ou segurança pessoal, isso vem primeiro: acolha, reconheça, e trate a prática como apoio, nunca como solução do risco.

Diferenciação obrigatória entre práticas:
- BANHOS DE ERVAS: use EXCLUSIVAMENTE material da categoria [BANHO] (fitoenergética). Banhos são preparados com plantas, ervas e flores naturais em água.
- FLORAIS DE BACH: remédios para uso INTERNO (gotas sob a língua) ou nos pulsos. NUNCA sugira floral de Bach como ingrediente de banho.
- ÓLEOS ESSENCIAIS: podem ir em gotas na água do banho, mas são distintos de florais. Use apenas se o material indicar essa aplicação.
- Se ela pediu banho, entregue um banho de ervas. Se pediu equilíbrio emocional sem mencionar banho, pode sugerir floral. Nunca combine as duas coisas num mesmo banho.

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
    return new Response(null, { headers: corsHeaders(req) });
  }

  try {
    // O cliente manda apenas o que a usuária escreveu. O texto de
    // instrução é montado aqui, a partir do módulo.
    const body = await req.json();
    const inputText: string = (body.message ?? body.query ?? '').toString();
    const moduleKey: string = body.module ?? 'geral';

    if (!inputText.trim()) {
      return erro(req, 400, 'Mensagem é obrigatória');
    }
    if (inputText.length > MAX_ENTRADA) {
      return erro(req, 400, `A mensagem pode ter no máximo ${MAX_ENTRADA} caracteres.`);
    }
    if (!MODULOS_VALIDOS.has(moduleKey)) {
      return erro(req, 400, `Módulo desconhecido: ${moduleKey}`);
    }

    const supabase = servico();

    // ── Autenticação ─────────────────────────────────────────
    const auth = await exigirUsuaria(req, supabase);
    if ('resposta' in auth) return auth.resposta;
    const user = auth.usuaria;

    // ── Perfil: plano e contexto ─────────────────────────────
    // O contexto vem do banco, não do corpo da requisição: antes era
    // o navegador quem dizia qual era o signo e a fase do ciclo.
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan_type, full_name, sign_sun, sign_moon, sign_rising, last_period_date, cycle_duration, birth_date')
      .eq('user_id', user.id)
      .maybeSingle();

    const planType = (profile?.plan_type ?? '').toLowerCase();
    const weeklyLimit = PLAN_LIMITS[planType] ?? DEFAULT_LIMIT;

    // ── Limite do chat livre ─────────────────────────────────
    // Os módulos têm limite próprio, conferido no débito lá embaixo.
    if (moduleKey === 'geral' && weeklyLimit !== -1) {
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
          { status: 429, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }
    }

    // ── Crédito do módulo, conferido e debitado no servidor ──
    // Antes o `module` chegava aqui e era ignorado: o controle vivia
    // inteiramente no navegador, em usePlanCredit.
    if (moduleKey !== 'geral') {
      const { error: creditoError } = await supabase.rpc('consume_module_credit', {
        p_user_id: user.id,
        p_module: moduleKey,
        p_week_start: getWeekStart(),
      });

      if (creditoError) {
        const semPlano = creditoError.message?.includes('sem_plano');
        return new Response(
          JSON.stringify({
            error: semPlano ? 'sem_plano' : 'limit_reached',
            message: semPlano
              ? 'Este módulo faz parte dos planos do portal.'
              : 'Você já usou suas consultas deste módulo nesta semana, minha querida.',
          }),
          { status: 429, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }
    }

    // ── Memória da conversa ──────────────────────────────────
    // Só o chat livre tem memória: os módulos são consultas
    // independentes, e arrastar contexto entre eles confundiria mais
    // do que ajudaria.
    //
    // O histórico vem do banco, nunca do cliente: se viesse de lá,
    // seria possível forjar falas da sacerdotisa e induzi-la a quebrar
    // as próprias regras.
    const TROCAS_LEMBRADAS = 3;
    let historico: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    if (moduleKey === 'geral') {
      const { data: anteriores } = await supabase
        .from('sacerdotisa_messages')
        .select('role, content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(TROCAS_LEMBRADAS * 2);

      // Vieram da mais recente para a mais antiga; a conversa precisa
      // da ordem inversa.
      historico = ((anteriores ?? []).reverse() as typeof historico);

      // A conversa tem de começar por uma fala da usuária.
      while (historico.length > 0 && historico[0].role !== 'user') historico.shift();
    }

    // ── Texto efetivamente enviado ao modelo ─────────────────
    const cicloAtual = faseDoCiclo(profile?.last_period_date, profile?.cycle_duration ?? 28);

    const promptFinal = montarPrompt(moduleKey, inputText.trim(), {
      nome: profile?.full_name,
      signo_solar: profile?.sign_sun,
      fase_ciclo: cicloAtual,
    });

    // ── Persona ──────────────────────────────────────────────
    const persona = PERSONAS[planType] ?? PERSONAS['hecate'];

    // ── RAG: embedding semântico da query ────────────────────
    // Detecta intenção de banho para filtrar categoria correta
    const BANHO_KEYWORDS = ['banho', 'erva', 'imersão', 'banheira', 'chá para banhar', 'defumação'];
    const FLORAL_KEYWORDS = ['floral', 'bach', 'remédio floral', 'gotinhas'];
    const lowerInput = inputText.toLowerCase();
    const wantsBanho = moduleKey === 'banho_personalizado'
      || BANHO_KEYWORDS.some(k => lowerInput.includes(k));
    const wantsFloral = moduleKey === 'florais'
      || FLORAL_KEYWORDS.some(k => lowerInput.includes(k));
    const ragCategory = wantsBanho && !wantsFloral ? 'banho' : null;

    const SEM_BASE = '\n\n--- BASE DE CONHECIMENTO ---\nNenhuma informação relevante encontrada para esta consulta.';
    const formatar = (chunks: Array<{ category: string; title: string; content: string }>) =>
      '\n\n--- BASE DE CONHECIMENTO ---\n' +
      chunks.map(c => `[${c.category.toUpperCase()}] ${c.title}:\n${c.content}`).join('\n\n');

    let knowledgeContext = SEM_BASE;
    try {
      // Usa o mesmo modelo gte-small do ingest-knowledge (384 dims)
      const embeddingModel = new (Supabase as any).ai.Session('gte-small');
      const queryEmbedding = await embeddingModel.run(inputText, {
        mean_pool: true,
        normalize: true,
      });

      if (queryEmbedding) {
        const { data: chunks, error: ragError } = await supabase.rpc('match_knowledge', {
          query_embedding: queryEmbedding,
          match_count: 5,
          filter_category: ragCategory,
        });

        // Antes este erro era engolido por um catch vazio e virava
        // "não encontrei informação" na tela, sem alarme nenhum.
        if (ragError) throw ragError;

        const relevant = (chunks ?? []).filter(
          (c: { similarity: number }) => c.similarity > 0.5
        );
        if (relevant.length > 0) knowledgeContext = formatar(relevant);
      }
    } catch (ragErr) {
      console.error('RAG falhou, usando busca textual:', ragErr instanceof Error ? ragErr.message : ragErr);

      // Plano B: busca textual. `textSearch` monta um to_tsquery e
      // rejeita texto livre, então as palavras vão separadas por OR.
      const termos = inputText
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .filter(t => t.length > 3)
        .slice(0, 6);

      if (termos.length > 0) {
        const { data: chunks } = await supabase
          .from('knowledge_base')
          .select('title, content, category')
          .textSearch('content', termos.join(' | '), { config: 'portuguese' })
          .limit(3);

        if (chunks && chunks.length > 0) knowledgeContext = formatar(chunks);
      }
    }

    // ── Contexto da usuária ──────────────────────────────────
    // Lido do perfil, não do corpo da requisição.
    const partes: string[] = [];
    if (profile?.sign_sun) partes.push(`Sol em ${profile.sign_sun}`);
    if (profile?.sign_moon) partes.push(`Lua em ${profile.sign_moon}`);
    if (profile?.sign_rising) partes.push(`Ascendente ${profile.sign_rising}`);
    if (cicloAtual) partes.push(`Fase do ciclo: ${cicloAtual}`);
    partes.push(`Lua ${faseLunar()}`);

    // O arcano central era citado no chat e vinha do navegador; agora
    // sai da data de nascimento guardada no perfil.
    const arcano = arcanoCentral(profile?.birth_date);
    if (arcano) partes.push(`Arcano central: ${arcano.numero}, ${arcano.nome}`);
    const userContext = partes.length > 0
      ? `\n\n--- CONTEXTO DA USUÁRIA ---\n${partes.join(' | ')}`
      : '';

    // ── Incrementa uso do chat livre ─────────────────────────
    // Os módulos já foram debitados por consume_module_credit.
    if (moduleKey === 'geral' && weeklyLimit !== -1) {
      await supabase.rpc('increment_sacerdotisa_usage', { p_user_id: user.id });
    }

    // ── Modelo de IA, em fluxo ───────────────────────────────
    // Qual modelo responde, e qual é a reserva, vem do painel da
    // administradora (ver _shared/ia.ts); sem configuração, é o Claude
    // Haiku de sempre. Se a geração falhar aqui, o crédito já debitado
    // volta para a usuária: ela não perde a consulta por uma falha nossa.
    const estornarCredito = async () => {
      if (moduleKey === 'geral') return;
      await supabase.rpc('refund_module_credit', {
        p_user_id: user.id,
        p_module: moduleKey,
        p_week_start: getWeekStart(),
      });
    };

    const alvos = await resolverAlvos(supabase);
    if (alvos.length === 0) {
      await estornarCredito();
      throw new Error('nenhum modelo de IA com chave utilizável');
    }

    let resposta;
    try {
      // `abrirComReserva` só devolve depois de a primeira palavra chegar:
      // se o principal falhar antes disso (chave, limite, modelo, fora do
      // ar), a reserva assume e a usuária não percebe. Depois que ela
      // começa a ler, trocar de modelo misturaria dois textos.
      resposta = await abrirComReserva(alvos, {
        // O prompt pede respostas de 150 a 350 palavras. Em português
        // isso pode passar de 1024 tokens, que era o teto anterior e
        // cortava a resposta no meio da frase. O custo não muda: paga-se
        // pelo que é gerado, não pelo teto.
        maxTokens: 2048,
        sistema: [
          // Bloco estável (persona + regras): é o único que pode ser
          // reaproveitado entre chamadas. Antes o cache_control cobria
          // também o RAG e o contexto, que mudam a cada consulta, então
          // o prefixo nunca se repetia e não havia acerto de cache.
          { texto: persona + BASE_KNOWLEDGE, cache: true },
          // Bloco volátil: sem cache.
          { texto: knowledgeContext + userContext },
        ],
        mensagens: [...historico, { role: 'user', content: promptFinal }],
      });
    } catch (modeloErr) {
      await estornarCredito();
      throw modeloErr;
    }

    if (resposta.usouReserva) {
      // Para a administradora ver nos logs que o principal falhou, e por quê.
      console.warn(JSON.stringify({
        evento: 'ia_reserva_usada',
        respondeu: `${resposta.provedor}/${resposta.modelo}`,
        falhas: resposta.falhas,
      }));
    }

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        let respostaCompleta = '';

        try {
          for await (const texto of resposta.deltas) {
            respostaCompleta += texto;
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ text: texto })}\n\n`
            ));
          }

          // ── Guarda a troca, para a próxima mensagem ter contexto ──
          if (moduleKey === 'geral' && respostaCompleta) {
            const { error: memoriaErro } = await supabase
              .from('sacerdotisa_messages')
              .insert([
                { user_id: user.id, role: 'user', content: inputText.trim() },
                { user_id: user.id, role: 'assistant', content: respostaCompleta },
              ]);
            // Falhar aqui não estraga a resposta que ela já leu.
            if (memoriaErro) console.error('Falha ao guardar a conversa:', memoriaErro.message);
          }

          // ── Registro de uso e de aproveitamento de cache ─────────
          // `cache_lidos` em zero o tempo todo indica que o cache não está
          // entregando nada (vale para a Claude; as outras plataformas
          // reaproveitam o prefixo sozinhas e informam à sua maneira).
          // `parou_porque` com "max_tokens", "length" ou "MAX_TOKENS"
          // significa resposta cortada no meio.
          try {
            const uso = resposta.uso();
            console.log(JSON.stringify({
              modulo: moduleKey,
              modelo: `${resposta.provedor}/${resposta.modelo}`,
              usou_reserva: resposta.usouReserva,
              entrada: uso.entrada,
              saida: uso.saida,
              cache_escritos: uso.cacheEscritos ?? 0,
              cache_lidos: uso.cacheLidos ?? 0,
              trocas_lembradas: historico.length / 2,
              parou_porque: uso.parouPor,
            }));
          } catch { /* medição não pode derrubar a resposta */ }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (streamErr) {
          // Sem isto, uma falha no meio do streaming deixava o
          // controller aberto e a tela esperando para sempre.
          console.error('Erro no streaming:', streamErr instanceof Error ? streamErr.message : streamErr);
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ error: 'A conexão se interrompeu. Tente novamente.' })}\n\n`
          ));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        ...corsHeaders(req),
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (err: unknown) {
    console.error('sacerdotisa error:', err instanceof Error ? err.message : String(err));
    return erro(req, 500, 'A sacerdotisa não pôde responder agora. Tente novamente em instantes.');
  }
});
