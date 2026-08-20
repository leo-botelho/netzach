import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSacerdotisaStream } from './useSacerdotisaStream';

/**
 * O leitor de eventos estava copiado em sete arquivos. Agora é um só,
 * então os casos que antes quebravam em silêncio (pedaço cortado no
 * meio, erro anunciado pelo servidor, limite atingido) ficam cobertos.
 */

vi.mock('../contexts/useAuth', () => ({
  useAuth: () => ({
    session: { access_token: 'token-de-teste' },
    userId: 'usuaria-1',
    carregando: false,
    sair: vi.fn(),
  }),
}));

/** Monta uma resposta de fluxo a partir dos pedaços informados. */
function respostaEmFluxo(pedacos: string[], status = 200): Response {
  const encoder = new TextEncoder();
  let i = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i >= pedacos.length) { controller.close(); return; }
      controller.enqueue(encoder.encode(pedacos[i++]));
    },
  });
  return new Response(body, { status });
}

const evento = (texto: string) => `data: ${JSON.stringify({ text: texto })}\n\n`;

describe('useSacerdotisaStream', () => {
  beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('junta os pedaços do fluxo na resposta final', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      respostaEmFluxo([evento('Um banho '), evento('de rosas '), evento('brancas.'), 'data: [DONE]\n\n'])
    ));

    const { result } = renderHook(() => useSacerdotisaStream('banho_personalizado'));

    let retorno: boolean | undefined;
    await act(async () => { retorno = await result.current.consultar('quero paz'); });

    expect(retorno).toBe(true);
    expect(result.current.resposta).toBe('Um banho de rosas brancas.');
    expect(result.current.estado).toBe('ocioso');
  });

  it('remonta um evento partido no meio entre dois pedaços', async () => {
    // O corte cai no meio do JSON: o leitor precisa guardar o resto.
    const inteiro = evento('lavanda');
    const corte = Math.floor(inteiro.length / 2);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      respostaEmFluxo([inteiro.slice(0, corte), inteiro.slice(corte), 'data: [DONE]\n\n'])
    ));

    const { result } = renderHook(() => useSacerdotisaStream('florais'));
    await act(async () => { await result.current.consultar('ansiedade'); });

    expect(result.current.resposta).toBe('lavanda');
  });

  it('sinaliza limite atingido quando o servidor responde 429', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'limit_reached' }), { status: 429 })
    ));

    const { result } = renderHook(() => useSacerdotisaStream('florais'));

    let retorno: boolean | undefined;
    await act(async () => { retorno = await result.current.consultar('tristeza'); });

    expect(retorno).toBe(false);
    expect(result.current.bloqueado).toBe(true);
    expect(result.current.resposta).toBe('');
  });

  it('trata erro anunciado no meio do fluxo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      respostaEmFluxo([
        evento('Começando'),
        `data: ${JSON.stringify({ error: 'A conexão se interrompeu.' })}\n\n`,
      ])
    ));

    const { result } = renderHook(() => useSacerdotisaStream('relacionamento'));

    let retorno: boolean | undefined;
    await act(async () => { retorno = await result.current.consultar('tema'); });

    expect(retorno).toBe(false);
    expect(result.current.estado).toBe('erro');
    expect(result.current.mensagemErro).toBeTruthy();
  });

  it('não deixa a tela presa quando a rede falha', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('rede fora')));

    const { result } = renderHook(() => useSacerdotisaStream('lei_atracao'));
    await act(async () => { await result.current.consultar('abundância') });

    await waitFor(() => expect(result.current.gerando).toBe(false));
    expect(result.current.mensagemErro).toContain('tentar de novo');
  });

  it('recusa entrada vazia sem chamar o servidor', async () => {
    const fetchFalso = vi.fn();
    vi.stubGlobal('fetch', fetchFalso);

    const { result } = renderHook(() => useSacerdotisaStream('florais'));
    await act(async () => { await result.current.consultar('   '); });

    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it('envia o módulo e o texto da usuária, e nada além disso', async () => {
    const fetchFalso = vi.fn().mockResolvedValue(
      respostaEmFluxo([evento('ok'), 'data: [DONE]\n\n'])
    );
    vi.stubGlobal('fetch', fetchFalso);

    const { result } = renderHook(() => useSacerdotisaStream('banho_personalizado'));
    await act(async () => { await result.current.consultar('quero clareza'); });

    const [, opcoes] = fetchFalso.mock.calls[0];
    const corpo = JSON.parse(opcoes.body);

    expect(corpo).toEqual({ message: 'quero clareza', module: 'banho_personalizado' });
    // O prompt não é montado aqui: ele vive no servidor.
    expect(JSON.stringify(corpo)).not.toMatch(/Crie um banho|Recomende/);
    expect(opcoes.headers.Authorization).toBe('Bearer token-de-teste');
  });

  it('limpar zera a resposta e o estado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      respostaEmFluxo([evento('algo'), 'data: [DONE]\n\n'])
    ));

    const { result } = renderHook(() => useSacerdotisaStream('florais'));
    await act(async () => { await result.current.consultar('teste'); });
    expect(result.current.resposta).toBe('algo');

    act(() => { result.current.limpar(); });
    expect(result.current.resposta).toBe('');
    expect(result.current.estado).toBe('ocioso');
  });
});
