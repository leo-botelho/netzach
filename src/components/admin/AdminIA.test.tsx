import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminIA from './AdminIA';

/**
 * A tela só conversa com a função `ia-config`, simulada aqui. O que se
 * garante: a chave digitada some da tela depois de salva, a tela nunca
 * mostra uma chave guardada, cada escolha chega à função do jeito certo,
 * e os problemas de configuração aparecem em vez de falhar calados.
 */

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('../../lib/supabase', () => ({ supabase: { functions: { invoke } } }));

type Estado = {
  configurada: boolean;
  padrao: { provedor: string; modelo: string };
  segredo_de_cifra: boolean;
  chave_no_ambiente: { anthropic: boolean };
  chaves: Record<string, { ultimos4: string; atualizado_em: string } | null>;
  primario: { provedor: string; modelo: string };
  reserva: { provedor: string; modelo: string } | null;
  reserva_ligada: boolean;
  atualizado_em: string | null;
};

const base = (extra: Partial<Estado> = {}): Estado => ({
  configurada: false,
  padrao: { provedor: 'anthropic', modelo: 'claude-haiku-4-5-20251001' },
  segredo_de_cifra: true,
  chave_no_ambiente: { anthropic: true },
  chaves: { openai: null, anthropic: null, gemini: null, deepseek: null },
  primario: { provedor: 'anthropic', modelo: 'claude-haiku-4-5-20251001' },
  reserva: null,
  reserva_ligada: false,
  atualizado_em: null,
  ...extra,
});

const configurado = (): Estado => base({
  configurada: true,
  chaves: {
    openai: { ultimos4: 'cdef', atualizado_em: '2026-11-10T12:00:00Z' },
    anthropic: null,
    gemini: { ultimos4: 'wxyz', atualizado_em: '2026-11-10T12:00:00Z' },
    deepseek: null,
  },
  primario: { provedor: 'openai', modelo: 'gpt-5.1-mini' },
  reserva: { provedor: 'gemini', modelo: 'gemini-3.8-flash' },
  reserva_ligada: true,
  atualizado_em: '2026-11-10T12:00:00Z',
});

/** O que a tela manda para a função: sempre uma `acao` e, conforme ela, o resto. */
type Corpo = { acao: string; primario?: Estado['primario']; reserva?: Estado['reserva']; reserva_ligada?: boolean };

function funcao(respostas: Record<string, unknown | ((corpo: Corpo) => unknown)>) {
  invoke.mockImplementation(async (_nome: string, { body }: { body: Corpo }) => {
    const r = respostas[body.acao];
    const dado = typeof r === 'function' ? (r as (c: Corpo) => unknown)(body) : r;
    if (dado instanceof Error) {
      return { data: null, error: Object.assign(dado, { context: new Response(JSON.stringify({ error: 'x', mensagem: dado.message }), { status: 409 }) }) };
    }
    return { data: dado ?? { ok: true }, error: null };
  });
}

beforeEach(() => { invoke.mockReset(); });

const chamadas = (acao: string) => invoke.mock.calls.filter(c => c[1].body.acao === acao).map(c => c[1].body);

describe('AdminIA: estado inicial', () => {
  it('sem configuração, explica que vale o padrão de sempre', async () => {
    funcao({ ler: base() });
    render(<AdminIA />);
    expect(await screen.findByText(/usa o padrão: Claude \(Anthropic\), modelo claude-haiku-4-5-20251001/)).toBeInTheDocument();
    expect(screen.getByText('Usando a chave do servidor')).toBeInTheDocument();
  });

  it('mostra as chaves guardadas só pelos 4 últimos caracteres', async () => {
    funcao({ ler: configurado() });
    render(<AdminIA />);
    expect(await screen.findByText(/termina em ••••cdef/)).toBeInTheDocument();
    expect(screen.getByText(/termina em ••••wxyz/)).toBeInTheDocument();
  });

  it('o campo da chave é de senha, e nunca vem preenchido', async () => {
    funcao({ ler: configurado() });
    render(<AdminIA />);
    const campo = await screen.findByLabelText('Chave da OpenAI') as HTMLInputElement;
    expect(campo.type).toBe('password');
    expect(campo.value).toBe('');
  });

  it('carrega o principal e a reserva já salvos', async () => {
    funcao({ ler: configurado() });
    render(<AdminIA />);
    expect(await screen.findByDisplayValue('gpt-5.1-mini')).toBeInTheDocument();
    expect(screen.getByDisplayValue('gemini-3.8-flash')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeChecked();
  });
});

describe('AdminIA: problemas de configuração aparecem', () => {
  it('falta o segredo de cifra: mostra o comando e trava o salvar chave', async () => {
    funcao({ ler: base({ segredo_de_cifra: false }) });
    const user = userEvent.setup();
    render(<AdminIA />);
    expect(await screen.findByText(/Falta um passo antes de guardar chaves/)).toBeInTheDocument();
    expect(screen.getByText(/IA_ENCRYPTION_KEY/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Chave da OpenAI'), 'sk-proj-1234567890abcdefghij');
    expect(screen.getAllByRole('button', { name: 'Salvar chave' })[0]).toBeDisabled();
  });

  it('migration pendente: mostra a mensagem em vez de uma tela vazia', async () => {
    funcao({ ler: new Error('Rode a migration 20261110_ia_modelos.sql no banco.') });
    render(<AdminIA />);
    expect(await screen.findByRole('alert')).toHaveTextContent('20261110_ia_modelos.sql');
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });
});

describe('AdminIA: chaves', () => {
  it('envia a chave, limpa o campo e confirma só pelos 4 últimos', async () => {
    let lidas = 0;
    funcao({
      ler: () => (lidas++ === 0 ? base() : base({ chaves: { openai: { ultimos4: 'ghij', atualizado_em: 'x' }, anthropic: null, gemini: null, deepseek: null } })),
      salvar_chave: { ok: true, ultimos4: 'ghij' },
    });
    const user = userEvent.setup();
    render(<AdminIA />);

    const campo = await screen.findByLabelText('Chave da OpenAI') as HTMLInputElement;
    await user.type(campo, 'sk-proj-1234567890abcdefghij');
    await user.click(within(campo.closest('div')!.parentElement!).getByRole('button', { name: 'Salvar chave' }));

    await waitFor(() => expect(chamadas('salvar_chave')).toEqual([
      { acao: 'salvar_chave', provedor: 'openai', chave: 'sk-proj-1234567890abcdefghij' },
    ]));
    await waitFor(() => expect(campo.value).toBe(''));
    expect(await screen.findByText(/Chave da OpenAI guardada \(termina em ghij\)/)).toBeInTheDocument();
    // A chave inteira não aparece em lugar nenhum da tela.
    expect(document.body.textContent).not.toContain('sk-proj-1234567890abcdefghij');
  });

  it('mostra o motivo quando a função recusa a chave', async () => {
    funcao({ ler: base(), salvar_chave: new Error('A chave parece incompleta ou tem espaços. Copie de novo, inteira.') });
    const user = userEvent.setup();
    render(<AdminIA />);
    await user.type(await screen.findByLabelText('Chave da Gemini (Google)'), 'abcdefghijklmnopqrstuvwxyz');
    await user.click(screen.getAllByRole('button', { name: 'Salvar chave' })[2]);
    expect(await screen.findByRole('alert')).toHaveTextContent('incompleta ou tem espaços');
  });

  it('remover pede confirmação', async () => {
    funcao({ ler: configurado(), remover_chave: { ok: true } });
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    render(<AdminIA />);
    await screen.findByText(/termina em ••••cdef/);

    await user.click(screen.getAllByRole('button', { name: 'Remover' })[0]);
    expect(chamadas('remover_chave')).toHaveLength(0);
  });
});

describe('AdminIA: principal, reserva e troca', () => {
  it('só habilita salvar quando algo mudou', async () => {
    funcao({ ler: configurado() });
    const user = userEvent.setup();
    render(<AdminIA />);
    const salvar = await screen.findByRole('button', { name: 'Salvar configuração' });
    expect(salvar).toBeDisabled();

    const modelo = screen.getByDisplayValue('gpt-5.1-mini');
    await user.clear(modelo);
    await user.type(modelo, 'gpt-5.4');
    expect(salvar).toBeEnabled();
  });

  it('mesma plataforma, modelos diferentes: envia os dois como foram escritos', async () => {
    funcao({
      ler: configurado(),
      salvar_config: (c: Corpo) => base({ configurada: true, primario: c.primario, reserva: c.reserva ?? null, reserva_ligada: Boolean(c.reserva_ligada),
        chaves: { openai: { ultimos4: 'cdef', atualizado_em: 'x' }, anthropic: null, gemini: null, deepseek: null } }),
    });
    const user = userEvent.setup();
    render(<AdminIA />);
    await screen.findByDisplayValue('gpt-5.1-mini');

    const [plataformaReserva] = [screen.getAllByLabelText('Plataforma')[1]];
    await user.selectOptions(plataformaReserva, 'openai');
    const modeloReserva = screen.getAllByLabelText('Modelo')[1];
    await user.clear(modeloReserva);
    await user.type(modeloReserva, '  gpt-5.4  ');
    await user.click(screen.getByRole('button', { name: 'Salvar configuração' }));

    await waitFor(() => expect(chamadas('salvar_config')).toEqual([{
      acao: 'salvar_config',
      primario: { provedor: 'openai', modelo: 'gpt-5.1-mini' },
      reserva: { provedor: 'openai', modelo: 'gpt-5.4' },
      reserva_ligada: true,
    }]));
    expect(await screen.findByText(/Configuração salva/)).toBeInTheDocument();
  });

  it('trocar a plataforma limpa o modelo, para não sobrar um nome de outra', async () => {
    funcao({ ler: configurado() });
    const user = userEvent.setup();
    render(<AdminIA />);
    await screen.findByDisplayValue('gpt-5.1-mini');
    await user.selectOptions(screen.getAllByLabelText('Plataforma')[0], 'deepseek');
    expect(screen.queryByDisplayValue('gpt-5.1-mini')).not.toBeInTheDocument();
  });

  it('desligar a reserva sem modelo escolhido não trava o salvar', async () => {
    funcao({ ler: base({ primario: { provedor: 'anthropic', modelo: 'claude-haiku-4-5-20251001' } }) });
    const user = userEvent.setup();
    render(<AdminIA />);
    const principal = await screen.findByDisplayValue('claude-haiku-4-5-20251001');
    await user.clear(principal);
    await user.type(principal, 'claude-sonnet-5');
    expect(screen.getByRole('button', { name: 'Salvar configuração' })).toBeEnabled();
  });

  it('reserva ligada sem modelo avisa e trava o salvar', async () => {
    funcao({ ler: base() });
    const user = userEvent.setup();
    render(<AdminIA />);
    await screen.findByDisplayValue('claude-haiku-4-5-20251001');
    await user.click(screen.getByRole('checkbox'));
    expect(screen.getByText(/Escolha o modelo de reserva/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar configuração' })).toBeDisabled();
  });

  it('"Trocar" chama a função na hora, e só quando nada está pendente de salvar', async () => {
    funcao({
      ler: configurado(),
      trocar: base({ configurada: true, primario: { provedor: 'gemini', modelo: 'gemini-3.8-flash' }, reserva: { provedor: 'openai', modelo: 'gpt-5.1-mini' }, reserva_ligada: true }),
    });
    const user = userEvent.setup();
    render(<AdminIA />);
    const trocar = await screen.findByRole('button', { name: /Trocar principal e reserva/ });
    expect(trocar).toBeEnabled();

    await user.click(trocar);
    await waitFor(() => expect(chamadas('trocar')).toHaveLength(1));
    expect(await screen.findByDisplayValue('gemini-3.8-flash')).toBeInTheDocument();
    expect(screen.getByText(/Principal e reserva trocados/)).toBeInTheDocument();
  });

  it('com alteração pendente, "Trocar" fica travado', async () => {
    funcao({ ler: configurado() });
    const user = userEvent.setup();
    render(<AdminIA />);
    const modelo = await screen.findByDisplayValue('gpt-5.1-mini');
    await user.type(modelo, '-x');
    expect(screen.getByRole('button', { name: /Trocar principal e reserva/ })).toBeDisabled();
  });

  it('sem reserva cadastrada, não há o que trocar', async () => {
    funcao({ ler: base() });
    render(<AdminIA />);
    expect(await screen.findByRole('button', { name: /Trocar principal e reserva/ })).toBeDisabled();
  });
});

describe('AdminIA: testar', () => {
  it('mostra que funcionou, com o tempo', async () => {
    funcao({ ler: configurado(), testar: { ok: true, ms: 1234, resposta: 'ok' } });
    const user = userEvent.setup();
    render(<AdminIA />);
    await screen.findByDisplayValue('gpt-5.1-mini');
    await user.click(screen.getAllByRole('button', { name: 'Testar' })[0]);

    expect(await screen.findByText(/Funcionou: respondeu em 1.2 s \("ok"\)/)).toBeInTheDocument();
    expect(chamadas('testar')).toEqual([{ acao: 'testar', provedor: 'openai', modelo: 'gpt-5.1-mini' }]);
  });

  it('mostra o motivo quando não funcionou', async () => {
    funcao({ ler: configurado(), testar: { ok: false, ms: 300, erro: 'HTTP 401: Incorrect API key provided: ***' } });
    const user = userEvent.setup();
    render(<AdminIA />);
    await screen.findByDisplayValue('gemini-3.8-flash');
    await user.click(screen.getAllByRole('button', { name: 'Testar' })[1]);

    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 401');
    expect(chamadas('testar')[0]).toMatchObject({ provedor: 'gemini', modelo: 'gemini-3.8-flash' });
  });

  it('testa o que está escrito na tela, mesmo sem salvar', async () => {
    funcao({ ler: configurado(), testar: { ok: true, ms: 800, resposta: 'ok' } });
    const user = userEvent.setup();
    render(<AdminIA />);
    const modelo = await screen.findByDisplayValue('gpt-5.1-mini');
    await user.clear(modelo);
    await user.type(modelo, 'gpt-5.4');
    await user.click(screen.getAllByRole('button', { name: 'Testar' })[0]);

    await waitFor(() => expect(chamadas('testar')[0].modelo).toBe('gpt-5.4'));
  });

  it('sem modelo escrito, o teste fica travado', async () => {
    funcao({ ler: base({ primario: { provedor: 'openai', modelo: 'gpt-4.1' } }) });
    const user = userEvent.setup();
    render(<AdminIA />);
    const modelo = await screen.findByDisplayValue('gpt-4.1');
    await user.clear(modelo);
    expect(screen.getAllByRole('button', { name: 'Testar' })[0]).toBeDisabled();
  });
});
