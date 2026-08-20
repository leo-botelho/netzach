import { useCallback, useState } from 'react';
import { useAuth } from '../contexts/useAuth';

/**
 * Consulta à sacerdotisa com resposta em fluxo.
 *
 * O leitor de eventos estava copiado literalmente em sete arquivos,
 * com pequenas divergências entre eles. Uma correção precisava ser
 * aplicada sete vezes, e a que ficasse de fora só aparecia quando
 * aquela tela específica falhasse.
 *
 * `invoke()` do supabase-js não suporta streaming, por isso `fetch`
 * direto — mesmo motivo do commit 473653f.
 */

type Estado = 'ocioso' | 'gerando' | 'limite' | 'erro';

interface Retorno {
  resposta: string;
  estado: Estado;
  gerando: boolean;
  bloqueado: boolean;
  mensagemErro: string | null;
  consultar: (entrada: string) => Promise<boolean>;
  limpar: () => void;
}

export function useSacerdotisaStream(
  modulo: string,
  aoReceberTexto?: () => void
): Retorno {
  const { session } = useAuth();
  const [resposta, setResposta] = useState('');
  const [estado, setEstado] = useState<Estado>('ocioso');
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  const limpar = useCallback(() => {
    setResposta('');
    setEstado('ocioso');
    setMensagemErro(null);
  }, []);

  const consultar = useCallback(async (entrada: string): Promise<boolean> => {
    if (!entrada.trim() || estado === 'gerando') return false;

    setEstado('gerando');
    setResposta('');
    setMensagemErro(null);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sacerdotisa`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token ?? ''}`,
          },
          body: JSON.stringify({ message: entrada, module: modulo }),
        }
      );

      // 429 = limite semanal do módulo atingido.
      if (res.status === 429) { setEstado('limite'); return false; }

      if (!res.ok) throw new Error(`resposta ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error('resposta sem corpo');

      const decoder = new TextDecoder();
      let completa = '';
      let pendente = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        // O pedaço recebido pode cortar uma linha no meio; o resto
        // fica guardado para o próximo ciclo.
        pendente += decoder.decode(value, { stream: true });
        const linhas = pendente.split('\n');
        pendente = linhas.pop() ?? '';

        for (const linha of linhas) {
          if (!linha.startsWith('data: ')) continue;
          const conteudo = linha.slice(6).trim();
          if (conteudo === '[DONE]') continue;

          try {
            const json = JSON.parse(conteudo);
            if (json.error) throw new Error(json.error);
            if (json.text) {
              completa += json.text;
              setResposta(completa);
              aoReceberTexto?.();
            }
          } catch (e) {
            // Fragmento incompleto de JSON é esperado; erro anunciado
            // pelo servidor, não.
            if (e instanceof Error && e.message && !e.message.startsWith('Unexpected')) throw e;
          }
        }
      }

      if (!completa) throw new Error('resposta vazia');

      setEstado('ocioso');
      return true;

    } catch (err) {
      console.error(`Consulta ao módulo ${modulo} falhou:`, err);
      setEstado('erro');
      setMensagemErro('A conexão se perdeu no caminho. Que tal tentar de novo?');
      return false;
    }
  }, [modulo, session, estado, aoReceberTexto]);

  return {
    resposta,
    estado,
    gerando: estado === 'gerando',
    bloqueado: estado === 'limite',
    mensagemErro,
    consultar,
    limpar,
  };
}
