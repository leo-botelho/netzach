import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CeuDaSemana from './CeuDaSemana';

/**
 * O Céu reúne quatro tipos de publicação que dividem a mesma tabela,
 * separados só por `type` e `sign`. Trocar um pelo outro mostraria a
 * leitura de outro signo para a usuária, que é o pior erro possível
 * aqui.
 */

interface Linha { sign: string; type: string; content: string }

let previsoes: Linha[] = [];
let perfil: { sign_sun?: string; sign_moon?: string; sign_rising?: string } | null = null;

vi.mock('../contexts/useAuth', () => ({
  useAuth: () => ({ userId: 'usuaria-1', carregando: false, session: null, sair: vi.fn() }),
}));

vi.mock('../lib/supabase', () => {
  const criar = (tabela: string) => {
    const q: Record<string, unknown> = {};
    q.select = () => q;
    q.eq = () => q;
    q.order = () => Promise.resolve({ data: previsoes, error: null });
    q.maybeSingle = () => Promise.resolve({ data: perfil, error: null });
    void tabela;
    return q;
  };
  return { supabase: { from: (t: string) => criar(t) } };
});

const renderizar = async () => {
  render(<MemoryRouter><CeuDaSemana /></MemoryRouter>);
  await waitFor(() => expect(screen.queryByText(/sintonizando/i)).not.toBeInTheDocument());
};

describe('CeuDaSemana', () => {
  beforeEach(() => {
    previsoes = [];
    perfil = { sign_sun: 'Áries', sign_moon: 'Touro', sign_rising: 'Gêmeos' };
    // Segunda-feira, para o "dia de hoje" ser previsível.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-08-17T10:00:00'));
  });
  afterEach(() => { vi.useRealTimers(); });

  it('avisa que a leitura está sendo preparada quando não há nada publicado', async () => {
    await renderizar();
    expect(screen.getByText(/está sendo preparada/i)).toBeInTheDocument();
  });

  it('mostra o panorama da semana', async () => {
    previsoes = [{ sign: 'ceu_semana', type: 'sky_weekly', content: 'Vênus entra em Leão nesta semana.' }];
    await renderizar();
    expect(screen.getByText(/vênus entra em leão/i)).toBeInTheDocument();
  });

  it('destaca alertas de trânsito sensível', async () => {
    previsoes = [
      { sign: 'ceu_semana', type: 'sky_weekly', content: 'Panorama.' },
      { sign: 'Mercúrio retrógrado', type: 'transit_alert', content: 'Reveja contratos antes de assinar.' },
    ];
    await renderizar();
    expect(screen.getByText('Mercúrio retrógrado')).toBeInTheDocument();
    expect(screen.getByText(/reveja contratos/i)).toBeInTheDocument();
  });

  it('leva a previsão certa para cada corpo do mapa', async () => {
    previsoes = [
      { sign: 'áries',  type: 'sign_weekly', content: 'Leitura do Sol em Áries.' },
      { sign: 'touro',  type: 'sign_weekly', content: 'Leitura da Lua em Touro.' },
      { sign: 'gêmeos', type: 'sign_weekly', content: 'Leitura do Ascendente em Gêmeos.' },
      { sign: 'leão',   type: 'sign_weekly', content: 'Leitura de outra pessoa.' },
    ];
    await renderizar();

    expect(screen.getByText('Leitura do Sol em Áries.')).toBeInTheDocument();
    expect(screen.getByText('Leitura da Lua em Touro.')).toBeInTheDocument();
    expect(screen.getByText('Leitura do Ascendente em Gêmeos.')).toBeInTheDocument();
    // A leitura de um signo que não é dela não pode vazar para a tela.
    expect(screen.queryByText('Leitura de outra pessoa.')).not.toBeInTheDocument();
  });

  it('abre no dia de hoje', async () => {
    previsoes = [
      { sign: 'segunda', type: 'day_weekly', content: 'Comece devagar.' },
      { sign: 'terca',   type: 'day_weekly', content: 'Dia de ação.' },
    ];
    await renderizar();
    // 17/08/2026 é segunda-feira.
    expect(screen.getByText('Comece devagar.')).toBeInTheDocument();
    expect(screen.queryByText('Dia de ação.')).not.toBeInTheDocument();
  });

  it('deixa navegar para outro dia da semana', async () => {
    previsoes = [
      { sign: 'segunda', type: 'day_weekly', content: 'Comece devagar.' },
      { sign: 'quarta',  type: 'day_weekly', content: 'Meio de semana pede pausa.' },
    ];
    await renderizar();
    await userEvent.click(screen.getByRole('button', { name: /qua/i }));
    expect(screen.getByText('Meio de semana pede pausa.')).toBeInTheDocument();
  });

  it('só oferece os dias que têm leitura publicada', async () => {
    previsoes = [{ sign: 'segunda', type: 'day_weekly', content: 'Só a segunda.' }];
    await renderizar();
    expect(screen.getByRole('button', { name: /seg/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^sex/i })).not.toBeInTheDocument();
  });

  it('usa a publicação mais recente quando há repetida', async () => {
    // A consulta vem da mais nova para a mais antiga.
    previsoes = [
      { sign: 'ceu_semana', type: 'sky_weekly', content: 'Semana atual.' },
      { sign: 'ceu_semana', type: 'sky_weekly', content: 'Semana passada.' },
    ];
    await renderizar();
    expect(screen.getByText('Semana atual.')).toBeInTheDocument();
    expect(screen.queryByText('Semana passada.')).not.toBeInTheDocument();
  });

  it('convida a calcular o mapa quando ele ainda não existe', async () => {
    perfil = {};
    previsoes = [{ sign: 'ceu_semana', type: 'sky_weekly', content: 'Panorama.' }];
    await renderizar();
    expect(screen.getByText(/calcule seu mapa/i)).toBeInTheDocument();
  });

  it('avisa quando o signo dela ainda não tem leitura da semana', async () => {
    previsoes = [{ sign: 'ceu_semana', type: 'sky_weekly', content: 'Panorama.' }];
    await renderizar();
    expect(screen.getAllByText(/ainda não foi publicada/i).length).toBeGreaterThan(0);
  });
});
