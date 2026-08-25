import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DesvioRecuperacao from './DesvioRecuperacao';

/**
 * Quem chega por um link de recuperação tem que acabar em /nova-senha,
 * mesmo que o link a tenha deixado na home. Isso acontece de verdade: a
 * recuperação disparada pelo painel do Supabase vai sem destino, e ele
 * usa a Site URL no lugar.
 */

let ouvinte: ((evento: string) => void) | null = null;
const desinscrever = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: (evento: string) => void) => {
        ouvinte = cb;
        return { data: { subscription: { unsubscribe: desinscrever } } };
      },
    },
  },
}));

const renderizarEm = (rota: string) =>
  render(
    <MemoryRouter initialEntries={[rota]}>
      <DesvioRecuperacao />
      <Routes>
        <Route path="/" element={<p>home</p>} />
        <Route path="/nova-senha" element={<p>trocar senha</p>} />
        <Route path="/templo" element={<p>templo</p>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  ouvinte = null;
  desinscrever.mockClear();
});

describe('DesvioRecuperacao', () => {
  it('leva da home para a troca de senha quando o link é de recuperação', () => {
    renderizarEm('/');
    expect(screen.getByText('home')).toBeInTheDocument();

    act(() => ouvinte?.('PASSWORD_RECOVERY'));

    expect(screen.getByText('trocar senha')).toBeInTheDocument();
  });

  it('não mexe em quem só entrou normalmente', () => {
    renderizarEm('/templo');

    act(() => ouvinte?.('SIGNED_IN'));

    expect(screen.getByText('templo')).toBeInTheDocument();
  });

  it('deixa quem já está na tela certa em paz', () => {
    renderizarEm('/nova-senha');

    act(() => ouvinte?.('PASSWORD_RECOVERY'));

    expect(screen.getByText('trocar senha')).toBeInTheDocument();
  });

  it('solta o ouvinte ao sair', () => {
    const { unmount } = renderizarEm('/');
    unmount();
    expect(desinscrever).toHaveBeenCalled();
  });
});
