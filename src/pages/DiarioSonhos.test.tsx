import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DiarioSonhos from './DiarioSonhos';
import type { Sonho } from '../lib/simbolosOniricos';

/**
 * A tela afirma padrões sobre a vida onírica da usuária. O risco não é
 * quebrar: é dizer com confiança algo que os dados não sustentam.
 */

let registros: Sonho[] = [];

vi.mock('../contexts/useAuth', () => ({
  useAuth: () => ({ userId: 'usuaria-1', carregando: false, session: null, sair: vi.fn() }),
}));

vi.mock('../lib/supabase', () => {
  const consulta = {
    select: () => consulta,
    eq: () => consulta,
    not: () => consulta,
    order: () => consulta,
    limit: () => Promise.resolve({ data: registros, error: null }),
  };
  return { supabase: { from: () => consulta } };
});

const renderizar = async () => {
  render(<MemoryRouter><DiarioSonhos /></MemoryRouter>);
  await waitFor(() => expect(screen.queryByText(/sintonizando/i)).not.toBeInTheDocument());
};

const sonho = (over: Partial<Sonho> = {}): Sonho => ({
  date: '2026-08-19', dream_notes: 'sonhei com o mar', ...over,
});

describe('DiarioSonhos', () => {
  beforeEach(() => { registros = []; });

  describe('sem registros', () => {
    it('convida a começar em vez de mostrar tela vazia', async () => {
      await renderizar();
      expect(screen.getByText(/seu diário começa amanhã/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /check-in/i })).toBeInTheDocument();
    });
  });

  describe('com registros', () => {
    it('mostra o relato da usuária', async () => {
      registros = [sonho({ dream_notes: 'voei sobre uma cidade dourada' })];
      await renderizar();
      expect(screen.getByText('voei sobre uma cidade dourada')).toBeInTheDocument();
    });

    it('não anuncia padrão quando nada se repetiu', async () => {
      registros = [sonho({ dream_notes: 'sonhei com o mar' })];
      await renderizar();
      expect(screen.getByText(/ainda não há símbolo que se repita/i)).toBeInTheDocument();
    });

    it('nomeia o símbolo quando ele volta', async () => {
      registros = [
        sonho({ date: '2026-08-19', dream_notes: 'nadei no mar' }),
        sonho({ date: '2026-08-12', dream_notes: 'chovia muito' }),
      ];
      await renderizar();
      expect(screen.getByText('Água')).toBeInTheDocument();
      expect(screen.getByText(/2 vezes/)).toBeInTheDocument();
    });

    it('conta os registros no cabeçalho', async () => {
      registros = [sonho(), sonho({ date: '2026-08-18' })];
      await renderizar();
      expect(screen.getByText(/2 sonhos registrados/i)).toBeInTheDocument();
    });

    it('usa o singular com um registro só', async () => {
      registros = [sonho()];
      await renderizar();
      expect(screen.getByText(/1 sonho registrado/i)).toBeInTheDocument();
    });

    it('não afirma correlação com a lua sem registro suficiente', async () => {
      // Cinco sonhos na mesma fase ainda não são padrão.
      registros = Array.from({ length: 5 }, (_, i) =>
        sonho({ date: `2026-08-1${i}`, dream_moon_phase: 'Cheia' }));
      await renderizar();
      expect(screen.queryByText(/você sonha mais na/i)).not.toBeInTheDocument();
    });

    it('afirma a correlação quando há registro que a sustente', async () => {
      registros = [
        ...Array.from({ length: 5 }, (_, i) =>
          sonho({ date: `2026-08-0${i + 1}`, dream_moon_phase: 'Cheia' })),
        sonho({ date: '2026-07-20', dream_moon_phase: 'Nova' }),
      ];
      await renderizar();
      // "Lua Cheia" aparece também no card do símbolo recorrente, que
      // é correto; aqui interessa o destaque geral.
      const destaque = screen.getByText(/você sonha mais na/i);
      expect(destaque).toHaveTextContent(/Lua Cheia/);
    });

    it('mostra as emoções registradas', async () => {
      registros = [
        sonho({ dream_emotion: 'medo' }),
        sonho({ date: '2026-08-18', dream_emotion: 'medo' }),
      ];
      await renderizar();
      expect(screen.getByText(/Medo · 2/)).toBeInTheDocument();
    });

    it('não deixa o texto do sonho virar HTML', async () => {
      // O relato é escrito pela usuária e vai para a tela.
      registros = [sonho({ dream_notes: '<img src=x onerror=alert(1)> sonhei' })];
      await renderizar();
      expect(document.querySelector('img[onerror]')).toBeNull();
      expect(screen.getByText(/sonhei/)).toBeInTheDocument();
    });
  });
});
