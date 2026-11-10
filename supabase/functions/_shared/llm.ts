/**
 * Conversa com modelos de linguagem de quatro plataformas (OpenAI, Claude,
 * Gemini e DeepSeek) por uma interface só, com resposta em fluxo e troca
 * automática para um modelo de reserva.
 *
 * Sem biblioteca de nenhuma delas: é `fetch` direto, o que deixa o
 * comportamento igual em qualquer lugar e permite testar com respostas
 * simuladas.
 *
 * A troca para a reserva só acontece ANTES de a primeira palavra chegar:
 * depois que a aluna já está lendo, trocar de modelo no meio misturaria
 * dois textos. Por isso `abrir` espera o primeiro pedaço de texto antes de
 * devolver a resposta, e é nesse intervalo que tudo o que costuma falhar
 * (chave errada, limite, modelo inexistente, plataforma fora do ar,
 * resposta vazia) aparece e ainda pode ser contornado.
 */

export type Provedor = 'openai' | 'anthropic' | 'gemini' | 'deepseek';

export const PROVEDORES: Provedor[] = ['openai', 'anthropic', 'gemini', 'deepseek'];

export const NOMES_DOS_PROVEDORES: Record<Provedor, string> = {
  openai: 'OpenAI',
  anthropic: 'Claude (Anthropic)',
  gemini: 'Gemini (Google)',
  deepseek: 'DeepSeek',
};

export function ehProvedor(valor: unknown): valor is Provedor {
  return typeof valor === 'string' && (PROVEDORES as string[]).includes(valor);
}

/** O que vai em `modelo` vira parte de um endereço: só caracteres de nome de modelo. */
export function modeloValido(valor: unknown): valor is string {
  return typeof valor === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/-]{1,79}$/.test(valor);
}

export interface Alvo {
  provedor: Provedor;
  modelo: string;
  chave: string;
}

export interface BlocoDeSistema {
  texto: string;
  /** Só a Claude usa; nas outras o prefixo repetido é reaproveitado sozinho. */
  cache?: boolean;
}

export interface Pedido {
  sistema: BlocoDeSistema[];
  mensagens: Array<{ role: 'user' | 'assistant'; content: string }>;
  maxTokens: number;
}

export interface Uso {
  entrada?: number;
  saida?: number;
  cacheEscritos?: number;
  cacheLidos?: number;
  /** "end_turn", "stop", "length", "max_tokens"... o que a plataforma disser. */
  parouPor?: string;
}

export class ErroDoProvedor extends Error {
  constructor(
    public provedor: Provedor,
    public modelo: string,
    mensagem: string,
    public status?: number,
  ) {
    super(mensagem);
    this.name = 'ErroDoProvedor';
  }
}

export interface Tentativa {
  provedor: Provedor;
  modelo: string;
  erro: string;
}

export class ErroTodosFalharam extends Error {
  constructor(public falhas: Tentativa[]) {
    super(falhas.map(f => `${f.provedor}/${f.modelo}: ${f.erro}`).join(' | '));
    this.name = 'ErroTodosFalharam';
  }
}

// ───────────────────────────────────────────────────────────────
// Segurança: a chave nunca aparece em mensagem de erro
// ───────────────────────────────────────────────────────────────

/**
 * As plataformas costumam repetir a chave na própria mensagem de erro
 * ("Incorrect API key provided: sk-..."). Tudo o que vira texto para
 * log ou para o painel passa por aqui antes.
 */
export function redigir(texto: string, chave?: string): string {
  let t = texto;
  if (chave && chave.length >= 8) t = t.split(chave).join('***');
  return t
    .replace(/\bsk-[A-Za-z0-9_-]{8,}/g, '***')
    .replace(/\bAIza[A-Za-z0-9_-]{20,}/g, '***')
    .replace(/Bearer\s+[A-Za-z0-9._-]{8,}/gi, 'Bearer ***');
}

// ───────────────────────────────────────────────────────────────
// Leitura de resposta em fluxo (Server-Sent Events)
// ───────────────────────────────────────────────────────────────

export interface EventoSse {
  evento: string | null;
  dados: string;
}

function lerBloco(bloco: string): EventoSse | null {
  let evento: string | null = null;
  const dados: string[] = [];
  for (const linha of bloco.split('\n')) {
    if (linha.startsWith(':')) continue; // comentário, usado como "estou vivo"
    const i = linha.indexOf(':');
    const campo = i === -1 ? linha : linha.slice(0, i);
    const valor = i === -1 ? '' : linha.slice(i + 1).replace(/^ /, '');
    if (campo === 'event') evento = valor;
    else if (campo === 'data') dados.push(valor);
  }
  return dados.length ? { evento, dados: dados.join('\n') } : null;
}

/**
 * Lê um corpo SSE. Um pedaço de rede pode cortar um evento no meio, e
 * as plataformas misturam `\n` e `\r\n`: o texto é acumulado e só se
 * entrega o que já está completo.
 */
export async function* eventosSse(corpo: ReadableStream<Uint8Array>): AsyncGenerator<EventoSse> {
  const leitor = corpo.getReader();
  const decodificador = new TextDecoder();
  let pendente = '';
  try {
    while (true) {
      const { done, value } = await leitor.read();
      if (done) break;
      pendente = (pendente + decodificador.decode(value, { stream: true })).replace(/\r\n/g, '\n');

      let fim: number;
      while ((fim = pendente.indexOf('\n\n')) !== -1) {
        const evento = lerBloco(pendente.slice(0, fim));
        pendente = pendente.slice(fim + 2);
        if (evento) yield evento;
      }
    }
    const resto = lerBloco(pendente.trim());
    if (resto) yield resto;
  } finally {
    try { await leitor.cancel(); } catch { /* já fechado */ }
  }
}

// ───────────────────────────────────────────────────────────────
// Como cada plataforma recebe o pedido e responde
// ───────────────────────────────────────────────────────────────

interface Variante {
  /** OpenAI: `reasoning_effort` não é aceito por todos os modelos. */
  semRaciocinio?: boolean;
  /** OpenAI: modelos antigos só aceitam `max_tokens`. */
  tokensLegado?: boolean;
}

interface Requisicao {
  url: string;
  headers: Record<string, string>;
  corpo: unknown;
}

/**
 * Modelos que "pensam" antes de responder gastam parte do limite de
 * saída nesse raciocínio, invisível para a aluna. Com o mesmo teto dos
 * modelos comuns, a resposta pode sair cortada ou vazia.
 */
export function limiteDeSaida(alvo: Pick<Alvo, 'provedor' | 'modelo'>, base: number): number {
  const m = alvo.modelo.toLowerCase();
  const raciocina =
    (alvo.provedor === 'openai' && /^(gpt-5|o\d)/.test(m)) ||
    (alvo.provedor === 'gemini' && /gemini-(2\.5|[3-9])/.test(m)) ||
    (alvo.provedor === 'deepseek' && m.includes('reasoner'));
  return raciocina ? base * 4 : base;
}

function sistemaEmTexto(pedido: Pedido): string {
  return pedido.sistema.map(b => b.texto).join('\n\n');
}

export function montarRequisicao(alvo: Alvo, pedido: Pedido, variante: Variante = {}): Requisicao {
  const limite = limiteDeSaida(alvo, pedido.maxTokens);

  switch (alvo.provedor) {
    case 'anthropic':
      return {
        url: 'https://api.anthropic.com/v1/messages',
        headers: {
          'content-type': 'application/json',
          'x-api-key': alvo.chave,
          'anthropic-version': '2023-06-01',
        },
        corpo: {
          model: alvo.modelo,
          max_tokens: limite,
          stream: true,
          system: pedido.sistema.map(b => ({
            type: 'text',
            text: b.texto,
            ...(b.cache ? { cache_control: { type: 'ephemeral' } } : {}),
          })),
          messages: pedido.mensagens,
        },
      };

    case 'gemini':
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(alvo.modelo)}:streamGenerateContent?alt=sse`,
        headers: { 'content-type': 'application/json', 'x-goog-api-key': alvo.chave },
        corpo: {
          systemInstruction: { parts: [{ text: sistemaEmTexto(pedido) }] },
          contents: pedido.mensagens.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          generationConfig: { maxOutputTokens: limite },
        },
      };

    case 'deepseek':
      return {
        url: 'https://api.deepseek.com/chat/completions',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${alvo.chave}` },
        corpo: {
          model: alvo.modelo,
          stream: true,
          stream_options: { include_usage: true },
          max_tokens: limite,
          messages: [{ role: 'system', content: sistemaEmTexto(pedido) }, ...pedido.mensagens],
        },
      };

    case 'openai': {
      const raciocina = limite !== pedido.maxTokens;
      return {
        url: 'https://api.openai.com/v1/chat/completions',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${alvo.chave}` },
        corpo: {
          model: alvo.modelo,
          stream: true,
          stream_options: { include_usage: true },
          ...(variante.tokensLegado ? { max_tokens: limite } : { max_completion_tokens: limite }),
          ...(raciocina && !variante.semRaciocinio ? { reasoning_effort: 'low' } : {}),
          messages: [{ role: 'system', content: sistemaEmTexto(pedido) }, ...pedido.mensagens],
        },
      };
    }
  }
}

interface Leitura {
  texto?: string;
  uso?: Uso;
  fim?: string;
  erro?: string;
}

function json(dados: string): Record<string, any> | null {
  try { return JSON.parse(dados); } catch { return null; }
}

export function interpretar(provedor: Provedor, ev: EventoSse): Leitura {
  if (ev.dados === '[DONE]') return {};
  const d = json(ev.dados);
  if (!d) return {};

  if (provedor === 'anthropic') {
    switch (d.type) {
      case 'message_start': {
        const u = d.message?.usage ?? {};
        return { uso: { entrada: u.input_tokens, cacheEscritos: u.cache_creation_input_tokens, cacheLidos: u.cache_read_input_tokens } };
      }
      case 'content_block_delta':
        return d.delta?.type === 'text_delta' ? { texto: d.delta.text } : {};
      case 'message_delta':
        return { fim: d.delta?.stop_reason, uso: { saida: d.usage?.output_tokens } };
      case 'error':
        return { erro: d.error?.message ?? 'erro da plataforma' };
      default:
        return {};
    }
  }

  if (provedor === 'gemini') {
    if (d.error) return { erro: d.error.message ?? 'erro da plataforma' };
    if (d.promptFeedback?.blockReason) return { erro: `pedido bloqueado (${d.promptFeedback.blockReason})` };

    const candidato = d.candidates?.[0];
    // Partes marcadas como `thought` são o raciocínio do modelo, não a resposta.
    const texto = (candidato?.content?.parts ?? [])
      .filter((p: { thought?: boolean; text?: string }) => !p.thought && typeof p.text === 'string')
      .map((p: { text: string }) => p.text)
      .join('');
    const u = d.usageMetadata;
    return {
      texto: texto || undefined,
      fim: candidato?.finishReason,
      uso: u ? { entrada: u.promptTokenCount, saida: u.candidatesTokenCount, cacheLidos: u.cachedContentTokenCount } : undefined,
    };
  }

  // OpenAI e DeepSeek falam o mesmo formato.
  if (d.error) return { erro: d.error.message ?? 'erro da plataforma' };
  const escolha = d.choices?.[0];
  const u = d.usage;
  return {
    // `reasoning_content` (DeepSeek Reasoner) é o raciocínio: não é mostrado.
    texto: typeof escolha?.delta?.content === 'string' && escolha.delta.content ? escolha.delta.content : undefined,
    fim: escolha?.finish_reason ?? undefined,
    uso: u
      ? { entrada: u.prompt_tokens, saida: u.completion_tokens, cacheLidos: u.prompt_tokens_details?.cached_tokens ?? u.prompt_cache_hit_tokens }
      : undefined,
  };
}

// ───────────────────────────────────────────────────────────────
// Abrir uma resposta
// ───────────────────────────────────────────────────────────────

export interface RespostaAberta {
  provedor: Provedor;
  modelo: string;
  /** Pedaços de texto, na ordem. O primeiro já foi recebido. */
  deltas: AsyncGenerator<string, void, void>;
  /** Preenchido à medida que a plataforma informa; completo ao fim do fluxo. */
  uso: () => Uso;
}

/** Quanto esperar pela primeira palavra antes de desistir e tentar a reserva. */
export const LIMITE_PRIMEIRA_PALAVRA_MS = 25_000;

async function* transmitir(
  alvo: Alvo,
  pedido: Pedido,
  sinal: AbortSignal,
  uso: Uso,
): AsyncGenerator<string, void, void> {
  let variante: Variante = {};
  let resposta: Response | null = null;

  // A OpenAI tem dois parâmetros que variam de modelo para modelo. Em vez de
  // adivinhar pelo nome, tenta e, se ela disser qual não aceita, repete sem ele.
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const req = montarRequisicao(alvo, pedido, variante);
    resposta = await fetch(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify(req.corpo),
      signal: sinal,
    });
    if (resposta.ok) break;

    const texto = await resposta.text().catch(() => '');
    if (alvo.provedor === 'openai' && resposta.status === 400) {
      if (/reasoning_effort/i.test(texto) && !variante.semRaciocinio) { variante = { ...variante, semRaciocinio: true }; continue; }
      if (/max_completion_tokens/i.test(texto) && !variante.tokensLegado) { variante = { ...variante, tokensLegado: true }; continue; }
    }
    throw new ErroDoProvedor(alvo.provedor, alvo.modelo, `HTTP ${resposta.status}: ${redigir(texto, alvo.chave).slice(0, 300)}`, resposta.status);
  }

  if (!resposta?.ok || !resposta.body) {
    throw new ErroDoProvedor(alvo.provedor, alvo.modelo, 'a plataforma não devolveu uma resposta em fluxo');
  }

  for await (const ev of eventosSse(resposta.body)) {
    const leitura = interpretar(alvo.provedor, ev);
    if (leitura.erro) throw new ErroDoProvedor(alvo.provedor, alvo.modelo, redigir(leitura.erro, alvo.chave).slice(0, 300));
    if (leitura.uso) for (const [k, v] of Object.entries(leitura.uso)) if (v !== undefined) (uso as Record<string, unknown>)[k] = v;
    if (leitura.fim) uso.parouPor = leitura.fim;
    if (leitura.texto) yield leitura.texto;
  }
}

function comoErroDoProvedor(e: unknown, alvo: Alvo): ErroDoProvedor {
  if (e instanceof ErroDoProvedor) return e;
  const nome = e instanceof Error ? e.name : '';
  const msg = e instanceof Error ? e.message : String(e);
  const esgotou = nome === 'AbortError' || nome === 'TimeoutError' || /abort|timed? ?out/i.test(msg);
  return new ErroDoProvedor(
    alvo.provedor,
    alvo.modelo,
    esgotou ? 'a plataforma demorou demais para responder' : redigir(`${nome ? nome + ': ' : ''}${msg}`, alvo.chave).slice(0, 300),
  );
}

/**
 * Abre a resposta de UM modelo e espera a primeira palavra. Falha com
 * `ErroDoProvedor` (sem a chave na mensagem) se a plataforma recusar,
 * demorar demais ou responder vazio.
 */
export async function abrir(
  alvo: Alvo,
  pedido: Pedido,
  opcoes: { limiteMs?: number } = {},
): Promise<RespostaAberta> {
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), opcoes.limiteMs ?? LIMITE_PRIMEIRA_PALAVRA_MS);
  const uso: Uso = {};
  const gerador = transmitir(alvo, pedido, controle.signal, uso);

  try {
    const primeiro = await gerador.next();
    clearTimeout(relogio);

    if (primeiro.done || !primeiro.value) {
      throw new ErroDoProvedor(
        alvo.provedor, alvo.modelo,
        `a resposta veio vazia${uso.parouPor ? ` (motivo: ${uso.parouPor})` : ''}`,
      );
    }

    async function* tudo(): AsyncGenerator<string, void, void> {
      yield primeiro.value as string;
      yield* gerador;
    }
    return { provedor: alvo.provedor, modelo: alvo.modelo, deltas: tudo(), uso: () => uso };
  } catch (e) {
    clearTimeout(relogio);
    controle.abort();
    throw comoErroDoProvedor(e, alvo);
  }
}

export interface RespostaComReserva extends RespostaAberta {
  /** Verdadeiro se quem respondeu não foi o primeiro da lista. */
  usouReserva: boolean;
  /** O que deu errado antes, por tentativa. Sem chaves. */
  falhas: Tentativa[];
}

/**
 * Tenta cada modelo da lista, na ordem, até um começar a responder. A
 * reserva só entra quando o principal falha; a aluna não percebe a troca.
 */
export async function abrirComReserva(
  alvos: Alvo[],
  pedido: Pedido,
  opcoes: { limiteMs?: number } = {},
): Promise<RespostaComReserva> {
  const falhas: Tentativa[] = [];

  for (const alvo of alvos) {
    try {
      const aberta = await abrir(alvo, pedido, opcoes);
      return { ...aberta, usouReserva: falhas.length > 0, falhas };
    } catch (e) {
      falhas.push({
        provedor: alvo.provedor,
        modelo: alvo.modelo,
        erro: e instanceof Error ? redigir(e.message, alvo.chave) : String(e),
      });
    }
  }
  throw new ErroTodosFalharam(falhas);
}
