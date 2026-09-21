import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Comentarios, { type Comentario } from './Comentarios';

/**
 * A resposta da Raquel passa pelo servidor, que grava e avisa a aluna;
 * nunca pelo send-push direto, que sem destino avisaria a base inteira.
 * O comentário da aluna grava direto, sem aviso nenhum.
 */

// vi.hoisted: o vi.mock sobe para o topo do arquivo, antes destas linhas.
const { estado, invoke, insert } = vi.hoisted(() => ({
  estado: { admin: false, lista: [] as Comentario[] },
  invoke: vi.fn(),
  insert: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (nome: string) => Promise.resolve(
      nome === 'is_admin' ? { data: estado.admin, error: null } : { data: estado.lista, error: null },
    ),
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'eu' } } } }) },
    from: () => ({ insert }),
    functions: { invoke },
  },
}));

const pergunta: Comentario = {
  id: 'c1', resposta_a: null, texto: 'Posso fazer o exercício de noite?',
  created_at: new Date().toISOString(), autora: 'Ana', da_raquel: false, meu: false, oculto: false,
};

beforeEach(() => {
  // Redefinido a cada teste: a configuração do Vitest zera os mocks entre eles.
  invoke.mockReset().mockResolvedValue({ data: { ok: true, avisadas: 1 }, error: null });
  insert.mockReset().mockResolvedValue({ error: null });
  estado.lista = [pergunta];
});

async function responderAPergunta() {
  const user = userEvent.setup();
  render(<Comentarios aulaId="aula-1" />);
  await user.click(await screen.findByRole('button', { name: 'Responder' }));
  await user.type(screen.getByLabelText('Seu comentário'), 'Pode sim');
  await user.click(screen.getByRole('button', { name: 'Comentar' }));
}

describe('Comentarios', () => {
  it('a resposta da Raquel vai para o servidor, que avisa a aluna', async () => {
    estado.admin = true;
    await responderAPergunta();

    await waitFor(() => expect(invoke).toHaveBeenCalledWith('responder-duvida', {
      body: { comentario_id: 'c1', texto: 'Pode sim' },
    }));
    expect(insert).not.toHaveBeenCalled();
  });

  it('a resposta de uma aluna grava direto, sem aviso', async () => {
    estado.admin = false;
    await responderAPergunta();

    await waitFor(() => expect(insert).toHaveBeenCalledWith({
      aula_id: 'aula-1', user_id: 'eu', texto: 'Pode sim', resposta_a: 'c1',
    }));
    expect(invoke).not.toHaveBeenCalled();
  });

  it('a resposta da Raquel aparece marcada como dela', async () => {
    estado.lista = [pergunta, {
      ...pergunta, id: 'c2', resposta_a: 'c1', texto: 'Pode sim', autora: 'Raquel', da_raquel: true,
    }];
    render(<Comentarios aulaId="aula-1" />);
    expect(await screen.findByText('Raquel ✦')).toBeInTheDocument();
  });

  it('cada comentário tem endereço, para o aviso abrir direto na conversa', async () => {
    render(<Comentarios aulaId="aula-1" />);
    await screen.findByText(pergunta.texto);
    expect(document.getElementById('comentario-c1')).not.toBeNull();
  });
});
