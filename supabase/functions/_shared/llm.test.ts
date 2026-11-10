// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  abrir, abrirComReserva, eventosSse, interpretar, montarRequisicao, limiteDeSaida, redigir,
  modeloValido, ehProvedor, ErroDoProvedor, ErroTodosFalharam,
  type Alvo, type Pedido,
} from './llm';

/**
 * Nenhum teste aqui fala com plataforma de verdade: `fetch` é trocado por
 * respostas montadas à mão no formato que cada uma usa. O que se fixa é o
 * que a Sacerdotisa depende: o texto chega inteiro e em ordem, a reserva
 * assume quando o principal falha ANTES de responder, e a chave nunca
 * aparece num erro.
 */

const pedido: Pedido = {
  sistema: [
    { texto: 'Você é a sacerdotisa.', cache: true },
    { texto: 'Contexto da consulta.' },
  ],
  mensagens: [
    { role: 'user', content: 'oi' },
    { role: 'assistant', content: 'olá' },
    { role: 'user', content: 'me dê um banho' },
  ],
  maxTokens: 2048,
};

const CHAVE = 'sk-proj-ChaveSecretaDeTeste1234567890abcdef';
const alvo = (provedor: Alvo['provedor'], modelo: string, chave = CHAVE): Alvo => ({ provedor, modelo, chave });

// ── ajudantes para montar respostas em fluxo ─────────────────
const codificador = new TextEncoder();

function fluxo(pedacos: string[], falharNoFim = false): Response {
  // `pull` entrega um pedaço por leitura. Sinalizar o erro de dentro do
  // `start` descartaria os pedaços ainda na fila, e o texto nunca chegaria:
  // uma queda de verdade só acontece depois de a leitura já ter avançado.
  let i = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(c) {
      if (i < pedacos.length) c.enqueue(codificador.encode(pedacos[i++]));
      else if (falharNoFim) c.error(new Error('conexão caiu'));
      else c.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

const sse = (dados: unknown, evento?: string) =>
  `${evento ? `event: ${evento}\n` : ''}data: ${typeof dados === 'string' ? dados : JSON.stringify(dados)}\n\n`;

const claude = (...textos: string[]) => [
  sse({ type: 'message_start', message: { usage: { input_tokens: 900, cache_creation_input_tokens: 800, cache_read_input_tokens: 0 } } }, 'message_start'),
  ...textos.map(t => sse({ type: 'content_block_delta', delta: { type: 'text_delta', text: t } }, 'content_block_delta')),
  sse({ type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 42 } }, 'message_delta'),
];

const openai = (...textos: string[]) => [
  ...textos.map(t => sse({ choices: [{ delta: { content: t }, finish_reason: null }] })),
  sse({ choices: [{ delta: {}, finish_reason: 'stop' }] }),
  sse({ choices: [], usage: { prompt_tokens: 700, completion_tokens: 55, prompt_tokens_details: { cached_tokens: 512 } } }),
  sse('[DONE]'),
];

const gemini = (...textos: string[]) => [
  ...textos.map(t => sse({ candidates: [{ content: { parts: [{ text: t }] } }] })),
  sse({ candidates: [{ content: { parts: [{ text: '' }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 600, candidatesTokenCount: 40 } }),
];

async function ler(resposta: { deltas: AsyncGenerator<string> }): Promise<string> {
  let texto = '';
  for await (const d of resposta.deltas) texto += d;
  return texto;
}

let chamadas: Array<{ url: string; init: RequestInit; corpo: any }>;
function simular(responder: (url: string, n: number) => Response | Promise<Response>) {
  chamadas = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    chamadas.push({ url, init, corpo: init.body ? JSON.parse(String(init.body)) : null });
    return responder(url, chamadas.length);
  }));
}

beforeEach(() => { chamadas = []; });
afterEach(() => { vi.unstubAllGlobals(); });

// ───────────────────────────────────────────────────────────────
describe('eventosSse', () => {
  const coletar = async (pedacos: string[]) => {
    const fora: Array<{ evento: string | null; dados: string }> = [];
    for await (const e of eventosSse(fluxo(pedacos).body!)) fora.push(e);
    return fora;
  };

  it('junta um evento cortado no meio entre dois pedaços de rede', async () => {
    const r = await coletar(['data: {"a":', '1}\n\nda', 'ta: {"b":2}\n\n']);
    expect(r.map(e => e.dados)).toEqual(['{"a":1}', '{"b":2}']);
  });

  it('entende quebra de linha do Windows e o nome do evento', async () => {
    const r = await coletar(['event: x\r\ndata: oi\r\n\r\n']);
    expect(r).toEqual([{ evento: 'x', dados: 'oi' }]);
  });

  it('ignora comentário de "estou vivo" e junta várias linhas de data', async () => {
    const r = await coletar([': ping\n\ndata: linha1\ndata: linha2\n\n']);
    expect(r).toEqual([{ evento: null, dados: 'linha1\nlinha2' }]);
  });

  it('entrega o último evento mesmo sem a linha em branco final', async () => {
    const r = await coletar(['data: fim']);
    expect(r.map(e => e.dados)).toEqual(['fim']);
  });

  it('não corta emoji nem acento no meio de um pedaço', async () => {
    const bytes = codificador.encode('data: {"t":"ação ✦"}\n\n');
    const meio = bytes.indexOf(0xe2) + 1; // no meio dos 3 bytes do ✦
    const stream = new ReadableStream<Uint8Array>({
      start(c) { c.enqueue(bytes.slice(0, meio)); c.enqueue(bytes.slice(meio)); c.close(); },
    });
    const fora: string[] = [];
    for await (const e of eventosSse(stream)) fora.push(JSON.parse(e.dados).t);
    expect(fora).toEqual(['ação ✦']);
  });
});

// ───────────────────────────────────────────────────────────────
describe('montarRequisicao', () => {
  it('Claude: chave no cabeçalho, cache só no bloco estável', () => {
    const r = montarRequisicao(alvo('anthropic', 'claude-haiku-4-5-20251001'), pedido);
    expect(r.url).toBe('https://api.anthropic.com/v1/messages');
    expect(r.headers['x-api-key']).toBe(CHAVE);
    expect(r.headers['anthropic-version']).toBe('2023-06-01');
    const c = r.corpo as any;
    expect(c.stream).toBe(true);
    expect(c.max_tokens).toBe(2048);
    expect(c.system[0]).toEqual({ type: 'text', text: 'Você é a sacerdotisa.', cache_control: { type: 'ephemeral' } });
    expect(c.system[1]).toEqual({ type: 'text', text: 'Contexto da consulta.' });
    expect(c.messages).toEqual(pedido.mensagens);
  });

  it('OpenAI: bloco de sistema vira uma mensagem só, no começo', () => {
    const c = montarRequisicao(alvo('openai', 'gpt-4.1-mini'), pedido).corpo as any;
    expect(c.messages[0]).toEqual({ role: 'system', content: 'Você é a sacerdotisa.\n\nContexto da consulta.' });
    expect(c.messages).toHaveLength(4);
    expect(c.max_completion_tokens).toBe(2048);
    expect(c.reasoning_effort).toBeUndefined();
    expect(c.stream_options).toEqual({ include_usage: true });
  });

  it('OpenAI: modelo de raciocínio ganha folga no limite e esforço baixo', () => {
    const c = montarRequisicao(alvo('openai', 'gpt-5.1-mini'), pedido).corpo as any;
    expect(c.max_completion_tokens).toBe(8192);
    expect(c.reasoning_effort).toBe('low');
  });

  it('OpenAI: variantes de compatibilidade tiram o parâmetro recusado', () => {
    const a = montarRequisicao(alvo('openai', 'gpt-5.1-mini'), pedido, { semRaciocinio: true }).corpo as any;
    expect(a.reasoning_effort).toBeUndefined();
    const b = montarRequisicao(alvo('openai', 'gpt-4o'), pedido, { tokensLegado: true }).corpo as any;
    expect(b.max_tokens).toBe(2048);
    expect(b.max_completion_tokens).toBeUndefined();
  });

  it('Gemini: a chave vai no cabeçalho, nunca no endereço', () => {
    const r = montarRequisicao(alvo('gemini', 'gemini-2.5-flash', 'AIzaSyChaveDeTesteQueNaoExiste12345'), pedido);
    expect(r.url).toContain('/models/gemini-2.5-flash:streamGenerateContent?alt=sse');
    expect(r.url).not.toContain('AIza');
    expect(r.headers['x-goog-api-key']).toContain('AIza');
    const c = r.corpo as any;
    expect(c.contents.map((m: any) => m.role)).toEqual(['user', 'model', 'user']);
    expect(c.systemInstruction.parts[0].text).toContain('sacerdotisa');
  });

  it('DeepSeek: endereço próprio e max_tokens', () => {
    const r = montarRequisicao(alvo('deepseek', 'deepseek-chat'), pedido);
    expect(r.url).toBe('https://api.deepseek.com/chat/completions');
    expect((r.corpo as any).max_tokens).toBe(2048);
    expect(r.headers.authorization).toBe(`Bearer ${CHAVE}`);
  });

  it('o nome do modelo é escapado no endereço', () => {
    const r = montarRequisicao(alvo('gemini', 'a/b?x=1'), pedido);
    expect(r.url).not.toContain('?x=1');
  });
});

describe('limiteDeSaida', () => {
  it('só modelos que raciocinam ganham folga', () => {
    expect(limiteDeSaida({ provedor: 'openai', modelo: 'gpt-5.4' }, 100)).toBe(400);
    expect(limiteDeSaida({ provedor: 'openai', modelo: 'o4-mini' }, 100)).toBe(400);
    expect(limiteDeSaida({ provedor: 'openai', modelo: 'gpt-4.1' }, 100)).toBe(100);
    expect(limiteDeSaida({ provedor: 'gemini', modelo: 'gemini-3.8-flash' }, 100)).toBe(400);
    expect(limiteDeSaida({ provedor: 'gemini', modelo: 'gemini-2.0-flash' }, 100)).toBe(100);
    expect(limiteDeSaida({ provedor: 'deepseek', modelo: 'deepseek-reasoner' }, 100)).toBe(400);
    expect(limiteDeSaida({ provedor: 'deepseek', modelo: 'deepseek-chat' }, 100)).toBe(100);
    expect(limiteDeSaida({ provedor: 'anthropic', modelo: 'claude-opus-5' }, 100)).toBe(100);
  });
});

// ───────────────────────────────────────────────────────────────
describe('abrir: cada plataforma', () => {
  it('Claude: texto em ordem, uso e cache', async () => {
    simular(() => fluxo(claude('Olá, ', 'iniciada.')));
    const r = await abrir(alvo('anthropic', 'claude-haiku-4-5-20251001'), pedido);
    expect(await ler(r)).toBe('Olá, iniciada.');
    expect(r.uso()).toMatchObject({ entrada: 900, saida: 42, cacheEscritos: 800, cacheLidos: 0, parouPor: 'end_turn' });
  });

  it('OpenAI: texto, uso e acerto de cache', async () => {
    simular(() => fluxo(openai('Banho ', 'de ervas.')));
    const r = await abrir(alvo('openai', 'gpt-4.1-mini'), pedido);
    expect(await ler(r)).toBe('Banho de ervas.');
    expect(r.uso()).toMatchObject({ entrada: 700, saida: 55, cacheLidos: 512, parouPor: 'stop' });
  });

  it('Gemini: texto e uso', async () => {
    simular(() => fluxo(gemini('Lua ', 'cheia.')));
    const r = await abrir(alvo('gemini', 'gemini-2.5-flash'), pedido);
    expect(await ler(r)).toBe('Lua cheia.');
    expect(r.uso()).toMatchObject({ entrada: 600, saida: 40, parouPor: 'STOP' });
  });

  it('Gemini: o raciocínio do modelo não vira resposta', async () => {
    simular(() => fluxo([
      sse({ candidates: [{ content: { parts: [{ text: 'pensando em voz alta', thought: true }] } }] }),
      sse({ candidates: [{ content: { parts: [{ text: 'Resposta certa.' }] }, finishReason: 'STOP' }] }),
    ]));
    expect(await ler(await abrir(alvo('gemini', 'gemini-3.8-flash'), pedido))).toBe('Resposta certa.');
  });

  it('DeepSeek: o raciocínio separado não vira resposta', async () => {
    simular(() => fluxo([
      sse({ choices: [{ delta: { reasoning_content: 'hmm' } }] }),
      sse({ choices: [{ delta: { content: 'Resposta.' } }] }),
      sse({ choices: [{ delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 5, prompt_cache_hit_tokens: 8 } }),
      sse('[DONE]'),
    ]));
    const r = await abrir(alvo('deepseek', 'deepseek-reasoner'), pedido);
    expect(await ler(r)).toBe('Resposta.');
    expect(r.uso().cacheLidos).toBe(8);
  });
});

// ───────────────────────────────────────────────────────────────
describe('abrir: erros', () => {
  it('chave recusada: erro com o status, sem a chave na mensagem', async () => {
    simular(() => new Response(
      JSON.stringify({ error: { message: `Incorrect API key provided: ${CHAVE}. You can find your API key at...` } }),
      { status: 401 },
    ));
    const erro = await abrir(alvo('openai', 'gpt-4.1'), pedido).catch(e => e);
    expect(erro).toBeInstanceOf(ErroDoProvedor);
    expect(erro.status).toBe(401);
    expect(erro.message).toContain('401');
    expect(erro.message).not.toContain(CHAVE);
    expect(erro.message).not.toContain('sk-proj');
  });

  it('evento de erro dentro do fluxo vira erro', async () => {
    simular(() => fluxo([sse({ type: 'error', error: { message: 'overloaded_error' } }, 'error')]));
    const erro = await abrir(alvo('anthropic', 'claude-opus-5'), pedido).catch(e => e);
    expect(erro).toBeInstanceOf(ErroDoProvedor);
    expect(erro.message).toContain('overloaded');
  });

  it('resposta vazia é erro, e diz o motivo que a plataforma deu', async () => {
    simular(() => fluxo([sse({ candidates: [{ finishReason: 'SAFETY' }] })]));
    const erro = await abrir(alvo('gemini', 'gemini-2.5-flash'), pedido).catch(e => e);
    expect(erro.message).toMatch(/vazia/);
    expect(erro.message).toContain('SAFETY');
  });

  it('pedido bloqueado pelo Gemini vira erro', async () => {
    simular(() => fluxo([sse({ promptFeedback: { blockReason: 'PROHIBITED_CONTENT' } })]));
    const erro = await abrir(alvo('gemini', 'gemini-2.5-flash'), pedido).catch(e => e);
    expect(erro.message).toContain('PROHIBITED_CONTENT');
  });

  it('plataforma que não responde dentro do prazo é abandonada', async () => {
    simular((_url) => new Promise<Response>(() => { /* nunca responde */ }) as unknown as Response);
    // O fetch simulado ignora o sinal, então simulamos o comportamento real: ele rejeita ao abortar.
    vi.stubGlobal('fetch', vi.fn((_u: string, init: RequestInit) => new Promise((_, rejeitar) => {
      init.signal?.addEventListener('abort', () => rejeitar(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    })));
    const erro = await abrir(alvo('openai', 'gpt-4.1'), pedido, { limiteMs: 30 }).catch(e => e);
    expect(erro).toBeInstanceOf(ErroDoProvedor);
    expect(erro.message).toMatch(/demorou demais/);
  });

  it('falha de rede vira erro legível, sem a chave', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError(`fetch failed (${CHAVE})`); }));
    const erro = await abrir(alvo('deepseek', 'deepseek-chat'), pedido).catch(e => e);
    expect(erro).toBeInstanceOf(ErroDoProvedor);
    expect(erro.message).not.toContain(CHAVE);
  });

  it('falha NO MEIO da resposta aparece na leitura, e não vira troca de modelo', async () => {
    simular(() => fluxo([...openai('Começo, ').slice(0, 1)], true));
    const r = await abrir(alvo('openai', 'gpt-4.1'), pedido);
    await expect(ler(r)).rejects.toThrow();
  });
});

describe('abrir: parâmetros que variam de modelo para modelo (OpenAI)', () => {
  it('se recusar reasoning_effort, repete sem ele e funciona', async () => {
    simular((_u, n) => n === 1
      ? new Response(JSON.stringify({ error: { message: "Unsupported parameter: 'reasoning_effort'" } }), { status: 400 })
      : fluxo(openai('ok')));
    const r = await abrir(alvo('openai', 'gpt-5.1-mini'), pedido);
    expect(await ler(r)).toBe('ok');
    expect(chamadas).toHaveLength(2);
    expect(chamadas[0].corpo.reasoning_effort).toBe('low');
    expect(chamadas[1].corpo.reasoning_effort).toBeUndefined();
  });

  it('se recusar max_completion_tokens, usa max_tokens', async () => {
    simular((_u, n) => n === 1
      ? new Response(JSON.stringify({ error: { message: "Unsupported parameter: 'max_completion_tokens'" } }), { status: 400 })
      : fluxo(openai('ok')));
    await ler(await abrir(alvo('openai', 'gpt-4'), pedido));
    expect(chamadas[1].corpo.max_tokens).toBe(2048);
    expect(chamadas[1].corpo.max_completion_tokens).toBeUndefined();
  });

  it('um 400 qualquer não fica repetindo', async () => {
    simular(() => new Response(JSON.stringify({ error: { message: 'model not found' } }), { status: 400 }));
    await expect(abrir(alvo('openai', 'gpt-9'), pedido)).rejects.toThrow(/400/);
    expect(chamadas).toHaveLength(1);
  });
});

// ───────────────────────────────────────────────────────────────
describe('abrirComReserva', () => {
  it('principal funcionando: a reserva nem é chamada', async () => {
    simular(() => fluxo(openai('do principal')));
    const r = await abrirComReserva([alvo('openai', 'gpt-5.1-mini'), alvo('anthropic', 'claude-opus-5')], pedido);
    expect(await ler(r)).toBe('do principal');
    expect(r.usouReserva).toBe(false);
    expect(r.falhas).toEqual([]);
    expect(chamadas).toHaveLength(1);
  });

  it('mesma plataforma, modelos diferentes: gpt-5.1-mini falha, gpt-5.4 responde', async () => {
    simular((_u, n) => n === 1
      ? new Response(JSON.stringify({ error: { message: 'The model `gpt-5.1-mini` does not exist' } }), { status: 404 })
      : fluxo(openai('da reserva')));
    const r = await abrirComReserva([alvo('openai', 'gpt-5.1-mini'), alvo('openai', 'gpt-5.4')], pedido);
    expect(await ler(r)).toBe('da reserva');
    expect(r.usouReserva).toBe(true);
    expect(r.modelo).toBe('gpt-5.4');
    expect(chamadas.map(c => c.corpo.model)).toEqual(['gpt-5.1-mini', 'gpt-5.4']);
    expect(r.falhas[0]).toMatchObject({ provedor: 'openai', modelo: 'gpt-5.1-mini' });
  });

  it('plataformas diferentes: Gemini fora do ar, Claude assume', async () => {
    simular(url => url.includes('googleapis')
      ? new Response('Service Unavailable', { status: 503 })
      : fluxo(claude('Resposta do Claude.')));
    const r = await abrirComReserva([alvo('gemini', 'gemini-3.8-flash', 'AIzaChaveDoGemini1234567890abcdef'), alvo('anthropic', 'claude-opus-5', 'sk-ant-ChaveDoClaude1234567890')], pedido);
    expect(await ler(r)).toBe('Resposta do Claude.');
    expect(r.provedor).toBe('anthropic');
    expect(r.usouReserva).toBe(true);
    expect(chamadas[0].url).toContain('googleapis');
    expect(chamadas[1].url).toContain('anthropic.com');
  });

  it('as chaves de cada plataforma vão só para ela', async () => {
    simular(url => url.includes('googleapis') ? new Response('x', { status: 500 }) : fluxo(claude('ok')));
    await abrirComReserva([alvo('gemini', 'g', 'CHAVE-DO-GEMINI-123456'), alvo('anthropic', 'c', 'CHAVE-DO-CLAUDE-123456')], pedido);
    const paraGemini = JSON.stringify(chamadas[0].init.headers) + chamadas[0].url + chamadas[0].init.body;
    const paraClaude = JSON.stringify(chamadas[1].init.headers) + chamadas[1].url + chamadas[1].init.body;
    expect(paraGemini).not.toContain('CHAVE-DO-CLAUDE');
    expect(paraClaude).not.toContain('CHAVE-DO-GEMINI');
  });

  it('resposta vazia do principal também aciona a reserva', async () => {
    simular((_u, n) => n === 1 ? fluxo([sse('[DONE]')]) : fluxo(openai('segunda tentativa')));
    const r = await abrirComReserva([alvo('openai', 'a'), alvo('openai', 'b')], pedido);
    expect(await ler(r)).toBe('segunda tentativa');
    expect(r.usouReserva).toBe(true);
  });

  it('principal e reserva falham: erro com as duas causas, sem chaves', async () => {
    simular(() => new Response(`quota exceeded for ${CHAVE}`, { status: 429 }));
    const erro = await abrirComReserva([alvo('openai', 'a'), alvo('openai', 'b')], pedido).catch(e => e);
    expect(erro).toBeInstanceOf(ErroTodosFalharam);
    expect(erro.falhas).toHaveLength(2);
    expect(erro.message).toContain('429');
    expect(erro.message).not.toContain(CHAVE);
  });

  it('sem reserva configurada, a falha do principal é o erro final', async () => {
    simular(() => new Response('erro', { status: 500 }));
    const erro = await abrirComReserva([alvo('openai', 'a')], pedido).catch(e => e);
    expect(erro).toBeInstanceOf(ErroTodosFalharam);
    expect(erro.falhas).toHaveLength(1);
  });

  it('lista vazia falha em vez de ficar calada', async () => {
    await expect(abrirComReserva([], pedido)).rejects.toBeInstanceOf(ErroTodosFalharam);
  });
});

// ───────────────────────────────────────────────────────────────
describe('redigir', () => {
  it('troca a chave exata onde ela aparecer', () => {
    expect(redigir(`falhou com ${CHAVE} e ${CHAVE}`, CHAVE)).toBe('falhou com *** e ***');
  });

  it('pega formatos conhecidos de chave mesmo sem saber qual é', () => {
    expect(redigir('key sk-ant-api03-AbCdEf1234567890xyz inválida')).not.toContain('AbCdEf');
    expect(redigir('key AIzaSyA1234567890abcdefghijklmnop inválida')).not.toContain('AIzaSyA');
    expect(redigir('Authorization: Bearer abcdef1234567890token')).not.toContain('abcdef1234567890token');
  });

  it('não estraga texto comum', () => {
    expect(redigir('HTTP 429: limite atingido', CHAVE)).toBe('HTTP 429: limite atingido');
  });
});

describe('validação de entradas', () => {
  it('reconhece as quatro plataformas', () => {
    for (const p of ['openai', 'anthropic', 'gemini', 'deepseek']) expect(ehProvedor(p)).toBe(true);
    expect(ehProvedor('groq')).toBe(false);
    expect(ehProvedor(undefined)).toBe(false);
  });

  it('aceita nomes de modelo reais e recusa o que não é nome', () => {
    for (const m of ['gpt-5.1-mini', 'gpt-5.4', 'gemini-3.8-flash', 'claude-opus-5', 'claude-haiku-4-5-20251001', 'deepseek-chat', 'models/x:y']) {
      expect(modeloValido(m)).toBe(true);
    }
    for (const m of ['', 'a', ' gpt', 'gpt 5', 'x?y=1', 'a'.repeat(81), '../etc', null, 42]) {
      expect(modeloValido(m)).toBe(false);
    }
  });
});

describe('interpretar: eventos que não são texto', () => {
  it('ignora marcadores e JSON quebrado', () => {
    expect(interpretar('openai', { evento: null, dados: '[DONE]' })).toEqual({});
    expect(interpretar('anthropic', { evento: null, dados: 'isto não é json' })).toEqual({});
    expect(interpretar('anthropic', { evento: 'ping', dados: '{"type":"ping"}' })).toEqual({});
  });
});
