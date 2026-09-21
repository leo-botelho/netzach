import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

/**
 * O botão de notificação desmarcava sozinho no iPhone. Dois caminhos
 * levavam a isso sem recarregar a tela, e ficam cobertos aqui: a
 * checagem inicial chegando depois de a usuária ativar, e o banco
 * recusando a inscrição sem ninguém saber.
 */

vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U');

const { upsert } = vi.hoisted(() => ({ upsert: vi.fn() }));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'eu' } } } }) },
    from: () => ({ upsert }),
  },
}));

// A checagem inicial fica pendurada até o teste mandar responder.
let responderChecagem: (sub: PushSubscription | null) => void;
const inscricao = {
  endpoint: 'https://push.apple.com/abc',
  toJSON: () => ({ endpoint: 'https://push.apple.com/abc', keys: { p256dh: 'p', auth: 'a' } }),
  unsubscribe: vi.fn().mockResolvedValue(true),
} as unknown as PushSubscription;

beforeEach(() => {
  localStorage.clear();
  upsert.mockReset().mockResolvedValue({ error: null });
  (inscricao.unsubscribe as ReturnType<typeof vi.fn>).mockReset().mockResolvedValue(true);

  let primeira = true;
  const pushManager = {
    getSubscription: vi.fn(() => {
      if (primeira) {
        primeira = false;
        return new Promise<PushSubscription | null>(r => { responderChecagem = r; });
      }
      return Promise.resolve(null);
    }),
    subscribe: vi.fn().mockResolvedValue(inscricao),
  };

  vi.stubGlobal('Notification', Object.assign(function () {}, {
    permission: 'default',
    requestPermission: vi.fn().mockResolvedValue('granted'),
  }));
  vi.stubGlobal('PushManager', function () {});
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { ready: Promise.resolve({ pushManager }) },
  });
});

afterEach(() => { vi.unstubAllGlobals(); });

async function carregarHook() {
  const { usePushNotifications } = await import('./usePushNotifications');
  return renderHook(() => usePushNotifications());
}

describe('usePushNotifications', () => {
  it('a checagem que chega depois de ativar não desmarca o botão', async () => {
    const { result } = await carregarHook();
    await waitFor(() => expect(result.current.isSupported).toBe(true));

    await act(async () => { await result.current.subscribe(); });
    expect(result.current.isSubscribed).toBe(true);

    // Agora sim a checagem do início responde, com o "inativo" de antes.
    await act(async () => { responderChecagem(null); });
    expect(result.current.isSubscribed).toBe(true);
  });

  it('sem ação da usuária, a checagem inicial vale', async () => {
    localStorage.setItem('netzach_push_subscribed', '1');
    const { result } = await carregarHook();
    await waitFor(() => expect(result.current.isSupported).toBe(true));

    await act(async () => { responderChecagem(null); });
    expect(result.current.isSubscribed).toBe(false);
  });

  it('se o banco recusar, não finge que ativou e desfaz a inscrição do aparelho', async () => {
    upsert.mockResolvedValue({ error: { message: 'permissão negada' } });
    const { result } = await carregarHook();
    await waitFor(() => expect(result.current.isSupported).toBe(true));

    let ok = true;
    await act(async () => { ok = await result.current.subscribe(); });

    expect(ok).toBe(false);
    expect(result.current.isSubscribed).toBe(false);
    expect(result.current.erro).toMatch(/Não consegui ativar/);
    expect(inscricao.unsubscribe).toHaveBeenCalled();
  });
});
