import { describe, it, expect, vi } from 'vitest';
import { instalarRecargaAoAtualizar, type Ambiente } from './atualizacaoDoApp';

/**
 * Cada correção que eu publicava demorava a chegar ao celular porque a
 * versão nova ficava esperando. Estes testes fixam quando a página
 * recarrega e, tão importante quanto, quando não recarrega.
 */

function montar(opcoes: { controlador?: boolean; visivel?: boolean } = {}) {
  const ouvintes: Record<string, Array<() => void>> = {};
  const registrar = (nome: string, fn: () => void) => { (ouvintes[nome] ??= []).push(fn); };
  const disparar = (nome: string) => ouvintes[nome]?.forEach(fn => fn());

  const estado = { visibilidade: opcoes.visivel === false ? 'hidden' : 'visible', ultima: 0, agora: 100_000 };
  const recarregar = vi.fn();

  const amb: Ambiente = {
    sw: {
      controller: opcoes.controlador === false ? null : ({} as ServiceWorker),
      addEventListener: ((n: string, fn: () => void) => registrar(`sw:${n}`, fn)) as ServiceWorkerContainer['addEventListener'],
    },
    documento: {
      get visibilityState() { return estado.visibilidade as DocumentVisibilityState; },
      addEventListener: ((n: string, fn: () => void) => registrar(`doc:${n}`, fn)) as Document['addEventListener'],
    },
    janela: { addEventListener: ((n: string, fn: () => void) => registrar(`win:${n}`, fn)) as Window['addEventListener'] },
    recarregar,
    guardarRecarga: { ler: () => estado.ultima, gravar: (a: number) => { estado.ultima = a; } },
    agora: () => estado.agora,
  };

  instalarRecargaAoAtualizar(amb);
  return { recarregar, disparar, estado };
}

describe('instalarRecargaAoAtualizar', () => {
  it('na primeira visita não recarrega: ganhar controlador não é atualização', () => {
    const { recarregar, disparar } = montar({ controlador: false, visivel: false });
    disparar('sw:controllerchange');
    expect(recarregar).not.toHaveBeenCalled();
  });

  it('versão nova com o app em uso espera a pessoa sair da tela', () => {
    const { recarregar, disparar, estado } = montar();
    disparar('sw:controllerchange');
    expect(recarregar).not.toHaveBeenCalled();

    estado.visibilidade = 'hidden';
    disparar('doc:visibilitychange');
    expect(recarregar).toHaveBeenCalledTimes(1);
  });

  it('versão nova com o app já em segundo plano recarrega na hora', () => {
    const { recarregar, disparar } = montar({ visivel: false });
    disparar('sw:controllerchange');
    expect(recarregar).toHaveBeenCalledTimes(1);
  });

  it('sem atualização pendente, sair da tela não recarrega nada', () => {
    const { recarregar, disparar, estado } = montar();
    estado.visibilidade = 'hidden';
    disparar('doc:visibilitychange');
    expect(recarregar).not.toHaveBeenCalled();
  });

  it('arquivo de página que sumiu (preloadError) recarrega na hora', () => {
    const { recarregar, disparar } = montar();
    disparar('win:vite:preloadError');
    expect(recarregar).toHaveBeenCalledTimes(1);
  });

  it('não entra em laço: a segunda recarga seguida é ignorada', () => {
    const { recarregar, disparar, estado } = montar();
    disparar('win:vite:preloadError');
    estado.agora += 3_000;
    disparar('win:vite:preloadError');
    expect(recarregar).toHaveBeenCalledTimes(1);
  });

  it('depois de um tempo, uma nova atualização pode recarregar de novo', () => {
    const { recarregar, disparar, estado } = montar();
    disparar('win:vite:preloadError');
    estado.agora += 60_000;
    disparar('win:vite:preloadError');
    expect(recarregar).toHaveBeenCalledTimes(2);
  });
});
