/**
 * Faz o app abrir a versão nova assim que ela existe.
 *
 * Contexto: o service worker mantém o app em cache no aparelho. Sem
 * configuração, uma versão nova instala e fica esperando até todas as
 * janelas do app fecharem, e no celular (onde o app instalado quase nunca
 * fecha de verdade) isso pode levar dias. Cada correção publicada chegava
 * tarde: o cadastro mandava para a página errada e o painel mostrava
 * textos antigos muito depois do conserto no ar.
 *
 * O `sw.ts` agora assume o controle na hora. Aqui fica a outra metade: a
 * página que já estava aberta ainda roda o código velho, então ela precisa
 * recarregar. Isso é feito com cuidado para não atrapalhar quem está no
 * meio de alguma coisa.
 */

export interface Ambiente {
  sw: Pick<ServiceWorkerContainer, 'controller' | 'addEventListener'>;
  documento: Pick<Document, 'visibilityState' | 'addEventListener'>;
  janela: Pick<Window, 'addEventListener'>;
  recarregar: () => void;
  /** Para não entrar em laço se a recarga não resolver. */
  guardarRecarga: { ler: () => number; gravar: (agora: number) => void };
  agora: () => number;
}

/** Duas recargas por atualização em menos de 15 s indicam laço. */
const JANELA_ANTI_LACO_MS = 15_000;

export function instalarRecargaAoAtualizar(amb: Ambiente) {
  // A primeira visita também troca "sem controlador" por "com controlador".
  // Isso não é uma atualização e não pode recarregar a página.
  const jaTinhaControlador = Boolean(amb.sw.controller);
  let pendente = false;

  const recarregar = () => {
    const agora = amb.agora();
    if (agora - amb.guardarRecarga.ler() < JANELA_ANTI_LACO_MS) return;
    amb.guardarRecarga.gravar(agora);
    amb.recarregar();
  };

  // Versão nova assumiu o controle. Recarrega assim que a pessoa sair da
  // tela (trocar de app, bloquear o celular): é o momento em que isso não
  // custa nada, e ninguém perde um formulário pela metade.
  amb.sw.addEventListener('controllerchange', () => {
    if (!jaTinhaControlador) return;
    if (amb.documento.visibilityState === 'hidden') return recarregar();
    pendente = true;
  });

  amb.documento.addEventListener('visibilitychange', () => {
    if (pendente && amb.documento.visibilityState === 'hidden') {
      pendente = false;
      recarregar();
    }
  });

  // Quem continua na tela e abre uma página nova pede um arquivo que a
  // versão nova já apagou. O Vite avisa com este evento; aí não há o que
  // esperar, a página precisa recarregar.
  amb.janela.addEventListener('vite:preloadError', () => recarregar());
}
