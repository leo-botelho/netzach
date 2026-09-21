import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import SessaoGuard from './SessaoGuard';
import { AuthContext, type AuthState } from '../contexts/authTypes';

/**
 * O guarda dos cursos só pergunta se há alguém logado. A assinatura não
 * entra: a aluna da Hotmart comprou o curso, não o plano.
 */

function Portal() {
  const estado = useLocation().state as { voltarPara?: string } | null;
  return <p>portal, voltar para {estado?.voltarPara ?? 'nada'}</p>;
}

const renderizar = (auth: Partial<AuthState>) =>
  render(
    <AuthContext.Provider value={{ session: null, userId: null, carregando: false, sair: async () => {}, ...auth }}>
      <MemoryRouter initialEntries={['/cursos/flor-da-vida/aula/123']}>
        <Routes>
          <Route element={<SessaoGuard />}>
            <Route path="/cursos/:slug/aula/:aulaId" element={<p>aula</p>} />
          </Route>
          <Route path="/portal" element={<Portal />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

describe('SessaoGuard', () => {
  it('deixa entrar quem está logada, sem olhar plano nem assinatura', () => {
    renderizar({ userId: 'aluna-da-hotmart' });
    expect(screen.getByText('aula')).toBeInTheDocument();
  });

  it('manda para o login quem não está logada, lembrando a aula', () => {
    renderizar({ userId: null });
    expect(screen.getByText('portal, voltar para /cursos/flor-da-vida/aula/123')).toBeInTheDocument();
  });

  it('espera a sessão carregar antes de decidir', () => {
    renderizar({ carregando: true });
    expect(screen.getByText('Sintonizando...')).toBeInTheDocument();
    expect(screen.queryByText('aula')).not.toBeInTheDocument();
  });
});
