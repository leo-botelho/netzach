import { Component, type ErrorInfo, type ReactNode } from 'react';
import { registrarErro } from '../lib/registrarErro';

/**
 * Rede de segurança para erros de renderização.
 *
 * Sem isto, um erro em qualquer componente derruba a árvore inteira e
 * a usuária fica olhando para uma tela branca, sem explicação e sem
 * saída. O portal não tinha nenhum.
 *
 * O tom segue a regra do documento (§11): nada de punitivo, nada de
 * linguagem de sistema. A usuária não precisa saber o que é um stack
 * trace, precisa saber que não foi culpa dela e o que fazer agora.
 */

interface Props {
  children: ReactNode;
}

interface State {
  falhou: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { falhou: false };

  static getDerivedStateFromError(): State {
    return { falhou: true };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error('Erro não tratado na interface:', erro, info.componentStack);
    // Vai para error_logs, no próprio Supabase. Não espera a resposta:
    // a tela de erro já está sendo mostrada.
    void registrarErro(erro, 'ErrorBoundary', info.componentStack ?? undefined);
  }

  render() {
    if (!this.state.falhou) return this.props.children;

    return (
      <div className="min-h-screen bg-netzach-bg text-netzach-text font-sans flex items-center justify-center p-6">
        <div className="bg-netzach-card border border-netzach-border rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
          <div className="text-4xl" aria-hidden="true">✦</div>
          <h1 className="font-mystic text-netzach-gold text-2xl">Algo se desalinhou</h1>
          <p className="text-sm text-netzach-muted leading-relaxed">
            Não foi você. Esta tela encontrou um obstáculo e não conseguiu se abrir.
            Que tal tentar de novo?
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-netzach-gold text-netzach-bg font-bold py-3 rounded-xl hover:bg-white transition-colors"
          >
            Recarregar
          </button>
          <a
            href="/templo"
            className="block text-xs text-netzach-muted hover:text-white transition-colors"
          >
            Voltar ao Templo
          </a>
        </div>
      </div>
    );
  }
}
