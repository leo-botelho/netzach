import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CartaoNotificacoes from './CartaoNotificacoes';

/**
 * No iPhone, o toque curto de quem ia rolar a tela contava como clique
 * em "Desativar", que fica no mesmo lugar do "Ativar". Desligar agora
 * pede dois toques, e o segundo não fica onde o dedo já estava.
 */

const { estado, unsubscribe } = vi.hoisted(() => ({
  estado: { isSubscribed: true },
  unsubscribe: vi.fn(),
}));

vi.mock('../hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({
    isSupported: true,
    permission: 'granted',
    isSubscribed: estado.isSubscribed,
    isLoading: false,
    erro: null,
    subscribe: vi.fn(),
    unsubscribe,
  }),
}));

beforeEach(() => {
  estado.isSubscribed = true;
  unsubscribe.mockReset().mockResolvedValue(undefined);
});

describe('CartaoNotificacoes', () => {
  it('um toque em "Desativar" só pergunta, não desliga', async () => {
    const user = userEvent.setup();
    render(<CartaoNotificacoes />);

    await user.click(screen.getByRole('button', { name: 'Desativar' }));

    expect(unsubscribe).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Manter' })).toBeInTheDocument();
  });

  it('o segundo toque no mesmo ponto cai em "Manter"', async () => {
    const user = userEvent.setup();
    render(<CartaoNotificacoes />);

    await user.click(screen.getByRole('button', { name: 'Desativar' }));
    // O último botão da fileira ocupa o lugar do "Desativar" original.
    const botoes = screen.getAllByRole('button');
    expect(botoes[botoes.length - 1]).toHaveTextContent('Manter');
  });

  it('confirmando, desliga', async () => {
    const user = userEvent.setup();
    render(<CartaoNotificacoes />);

    await user.click(screen.getByRole('button', { name: 'Desativar' }));
    await user.click(screen.getAllByRole('button', { name: 'Desativar' })[0]);

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('a pergunta some sozinha se ninguém responder', async () => {
    vi.useFakeTimers();
    render(<CartaoNotificacoes />);

    act(() => { screen.getByRole('button', { name: 'Desativar' }).click(); });
    expect(screen.getByRole('button', { name: 'Manter' })).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.queryByRole('button', { name: 'Manter' })).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
