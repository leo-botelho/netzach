import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from './Login';
import { AuthContext, type AuthState } from '../contexts/authTypes';

/**
 * Quem clica no link de confirmação do email cai em /portal?confirmado=1
 * e precisa entender, sem adivinhar, que a conta está pronta e o que
 * fazer agora.
 */

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { signInWithPassword: vi.fn() } },
}));

const renderizar = (rota: string, auth: Partial<AuthState> = {}) =>
  render(
    <AuthContext.Provider value={{ session: null, userId: null, carregando: false, sair: async () => {}, ...auth }}>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/portal" element={<Login />} />
          <Route path="/templo" element={<p>templo</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

describe('Login depois de confirmar o email', () => {
  it('sem sessão, avisa que a conta está pronta e manda entrar', () => {
    renderizar('/portal?confirmado=1');

    expect(screen.getByText('E-mail confirmado')).toBeInTheDocument();
    expect(screen.getByText(/Entre abaixo com o e-mail e a senha/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Entrar no Templo' })).not.toBeInTheDocument();
  });

  it('com sessão aberta pelo link, oferece ir direto ao Templo', async () => {
    const user = userEvent.setup();
    renderizar('/portal?confirmado=1', { userId: 'aluna-nova' });

    expect(screen.getByText(/você já está dentro/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Entrar no Templo' }));

    expect(screen.getByText('templo')).toBeInTheDocument();
  });

  it('o formulário de entrada continua na tela nos dois casos', () => {
    renderizar('/portal?confirmado=1');
    expect(screen.getByPlaceholderText('Seu e-mail de iniciada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('quem abre /portal normalmente não vê o aviso', () => {
    renderizar('/portal');
    expect(screen.queryByText('E-mail confirmado')).not.toBeInTheDocument();
  });

  it('só o valor 1 conta: um parâmetro qualquer não dispara o aviso', () => {
    renderizar('/portal?confirmado=talvez');
    expect(screen.queryByText('E-mail confirmado')).not.toBeInTheDocument();
  });
});
