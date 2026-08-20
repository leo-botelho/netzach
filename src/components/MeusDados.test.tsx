import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MeusDados from './MeusDados';

/**
 * Aqui mora a única ação do portal que não tem volta. Um botão de
 * apagar fácil demais de acionar é um defeito, não uma conveniência.
 */

const rpc = vi.fn();
const signOut = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    auth: { signOut: () => signOut() },
  },
}));

describe('MeusDados', () => {
  beforeEach(() => {
    rpc.mockReset().mockResolvedValue({ data: { perfil: {} }, error: null });
    signOut.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // O download cria um link e clica nele.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:teste');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  describe('exportação', () => {
    it('oferece baixar tudo em linguagem de gente', () => {
      render(<MeusDados />);
      expect(screen.getByRole('button', { name: /baixar tudo que é meu/i })).toBeInTheDocument();
    });

    it('pede os dados ao banco e monta o arquivo', async () => {
      render(<MeusDados />);
      await userEvent.click(screen.getByRole('button', { name: /baixar tudo/i }));
      expect(rpc).toHaveBeenCalledWith('exportar_meus_dados');
      expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
    });

    it('avisa quando não consegue, sem jargão', async () => {
      rpc.mockResolvedValue({ data: null, error: { message: 'falha interna' } });
      render(<MeusDados />);
      await userEvent.click(screen.getByRole('button', { name: /baixar tudo/i }));

      const aviso = await screen.findByRole('alert');
      expect(aviso).toBeInTheDocument();
      // A mensagem técnica fica no console, não na tela dela.
      expect(aviso.textContent).not.toMatch(/falha interna|error|rpc/i);
    });
  });

  describe('exclusão da conta', () => {
    it('não expõe o botão de apagar de imediato', () => {
      render(<MeusDados />);
      expect(screen.queryByRole('button', { name: /^apagar$/i })).not.toBeInTheDocument();
    });

    it('avisa que não tem volta antes de qualquer coisa', async () => {
      render(<MeusDados />);
      await userEvent.click(screen.getByRole('button', { name: /apagar minha conta/i }));
      expect(screen.getByText(/não tem volta/i)).toBeInTheDocument();
    });

    it('sugere guardar uma cópia antes', async () => {
      render(<MeusDados />);
      await userEvent.click(screen.getByRole('button', { name: /apagar minha conta/i }));
      expect(screen.getByText(/guardar uma cópia antes/i)).toBeInTheDocument();
    });

    it('mantém o apagar desligado até a palavra ser escrita', async () => {
      render(<MeusDados />);
      await userEvent.click(screen.getByRole('button', { name: /apagar minha conta/i }));

      const botao = screen.getByRole('button', { name: /^apagar$/i });
      expect(botao).toBeDisabled();

      await userEvent.type(screen.getByRole('textbox'), 'apagar tudo');
      expect(botao).toBeDisabled();
    });

    it('não apaga com a palavra errada', async () => {
      render(<MeusDados />);
      await userEvent.click(screen.getByRole('button', { name: /apagar minha conta/i }));
      await userEvent.type(screen.getByRole('textbox'), 'sim');
      await userEvent.click(screen.getByRole('button', { name: /^apagar$/i }));

      expect(rpc).not.toHaveBeenCalledWith('excluir_meus_dados');
    });

    it('apaga quando a palavra confere', async () => {
      render(<MeusDados />);
      await userEvent.click(screen.getByRole('button', { name: /apagar minha conta/i }));
      await userEvent.type(screen.getByRole('textbox'), 'APAGAR');
      await userEvent.click(screen.getByRole('button', { name: /^apagar$/i }));

      expect(rpc).toHaveBeenCalledWith('excluir_meus_dados');
    });

    it('deixa desistir a qualquer momento', async () => {
      render(<MeusDados />);
      await userEvent.click(screen.getByRole('button', { name: /apagar minha conta/i }));
      await userEvent.click(screen.getByRole('button', { name: /manter minha conta/i }));

      expect(screen.queryByRole('button', { name: /^apagar$/i })).not.toBeInTheDocument();
      expect(rpc).not.toHaveBeenCalledWith('excluir_meus_dados');
    });

    it('não desloga se a exclusão falhar', async () => {
      rpc.mockImplementation((nome: string) =>
        nome === 'excluir_meus_dados'
          ? Promise.resolve({ error: { message: 'falhou' } })
          : Promise.resolve({ data: {}, error: null }));

      render(<MeusDados />);
      await userEvent.click(screen.getByRole('button', { name: /apagar minha conta/i }));
      await userEvent.type(screen.getByRole('textbox'), 'APAGAR');
      await userEvent.click(screen.getByRole('button', { name: /^apagar$/i }));

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(signOut).not.toHaveBeenCalled();
    });
  });
});
