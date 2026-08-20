import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

/**
 * Antes de existir este componente, um erro em qualquer tela deixava
 * a usuária diante de uma página em branco.
 */

function ComponenteQueQuebra(): never {
  throw new Error('falha proposital do teste');
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // O React registra o erro no console mesmo quando ele é capturado.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('mostra o conteúdo normalmente quando não há erro', () => {
    render(
      <ErrorBoundary>
        <p>Conteúdo do templo</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('Conteúdo do templo')).toBeInTheDocument();
  });

  it('captura o erro em vez de deixar a tela em branco', () => {
    render(
      <ErrorBoundary>
        <ComponenteQueQuebra />
      </ErrorBoundary>
    );

    expect(screen.getByRole('heading', { name: /algo se desalinhou/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /recarregar/i })).toBeInTheDocument();
  });

  it('não culpa a usuária nem expõe linguagem técnica', () => {
    render(
      <ErrorBoundary>
        <ComponenteQueQuebra />
      </ErrorBoundary>
    );

    const texto = document.body.textContent ?? '';
    expect(texto).toMatch(/não foi você/i);
    // O tom do documento (§11) não admite jargão nem acusação.
    expect(texto).not.toMatch(/erro 500|stack|exception|undefined|falha proposital/i);
  });

  it('oferece caminho de volta ao Templo', () => {
    render(
      <ErrorBoundary>
        <ComponenteQueQuebra />
      </ErrorBoundary>
    );
    expect(screen.getByRole('link', { name: /templo/i })).toHaveAttribute('href', '/templo');
  });
});
