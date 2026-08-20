import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import DicaDoDia from './DicaDoDia';
import type { Dica } from '../lib/dicasContextuais';

/**
 * A dica é a única coisa no Templo que fala sem ser chamada. Se
 * aparecer quando não deveria, ou insistir depois de dispensada, vira
 * ruído no lugar de cuidado.
 */

const dispensar = vi.fn();
const estado: { dica: Dica | null; carregando: boolean } = { dica: null, carregando: false };

vi.mock('../hooks/useDicaContextual', () => ({
  useDicaContextual: () => ({ ...estado, dispensar }),
}));

const renderizar = () =>
  render(<MemoryRouter><DicaDoDia /></MemoryRouter>);

const dicaExemplo: Dica = {
  chave: 'sono_ruim',
  pilar: 'sono',
  prioridade: 4,
  titulo: 'Notei que o seu sono não tem estado leve',
  texto: 'Que tal uma gotinha de lavanda no travesseiro hoje à noite?',
  convite: { rotulo: 'Ver florais e óleos', rota: '/florais' },
};

describe('DicaDoDia', () => {
  beforeEach(() => {
    estado.dica = null;
    estado.carregando = false;
    dispensar.mockClear();
  });

  it('não ocupa espaço quando não há padrão a nomear', () => {
    const { container } = renderizar();
    expect(container).toBeEmptyDOMElement();
  });

  it('não mostra esqueleto enquanto carrega', () => {
    // A ausência de dica é o caso comum: um espaço piscando no Templo
    // todo dia seria pior do que não mostrar nada.
    estado.carregando = true;
    const { container } = renderizar();
    expect(container).toBeEmptyDOMElement();
  });

  it('mostra o título e o texto quando há dica', () => {
    estado.dica = dicaExemplo;
    renderizar();
    expect(screen.getByText(dicaExemplo.titulo)).toBeInTheDocument();
    expect(screen.getByText(dicaExemplo.texto)).toBeInTheDocument();
  });

  it('leva ao módulo do convite', () => {
    estado.dica = dicaExemplo;
    renderizar();
    expect(screen.getByRole('link', { name: /florais/i })).toHaveAttribute('href', '/florais');
  });

  it('funciona sem convite', () => {
    estado.dica = { ...dicaExemplo, convite: undefined };
    renderizar();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText(dicaExemplo.titulo)).toBeInTheDocument();
  });

  it('pode ser dispensada', async () => {
    estado.dica = dicaExemplo;
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: /dispensar/i }));
    expect(dispensar).toHaveBeenCalledOnce();
  });

  it('é anunciada como região própria para leitores de tela', () => {
    estado.dica = dicaExemplo;
    renderizar();
    expect(screen.getByRole('region', { name: /mensagem do dia/i })).toBeInTheDocument();
  });
});
