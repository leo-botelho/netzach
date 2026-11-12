/**
 * Divisão do texto por seções marcadas, para a ingestão em lote.
 *
 * O divisor automático por palavras (ingest-bulk) corta o texto onde o
 * limite cai, e em material de referência isso separa o NOME de uma planta
 * da sua DESCRIÇÃO: o trecho traz o efeito sem dizer de quem é. Aqui quem
 * escreve o texto marca onde cada item começa, com uma linha:
 *
 *   @@ Alecrim
 *   Alecrim (Rosmarinus officinalis)
 *   ...
 *
 * Cada seção vira um trecho próprio. Texto sem nenhuma marca continua
 * indo para o divisor por palavras, como sempre foi.
 */

export interface Secao {
  titulo: string;
  texto: string;
}

const MARCA = /^@@[ \t]+(.+?)[ \t]*$/;

/** `null` quando o texto não tem nenhuma marca `@@ Título`. */
export function dividirEmSecoes(texto: string): Secao[] | null {
  const linhas = texto.replace(/\r\n/g, '\n').split('\n');
  if (!linhas.some(l => MARCA.test(l))) return null;

  const secoes: Secao[] = [];
  let titulo = '';
  let corpo: string[] = [];

  const fechar = () => {
    const conteudo = corpo.join('\n').trim();
    if (conteudo) secoes.push({ titulo, texto: conteudo });
    corpo = [];
  };

  for (const linha of linhas) {
    const m = linha.match(MARCA);
    if (m) {
      fechar();
      titulo = m[1];
    } else {
      corpo.push(linha);
    }
  }
  fechar();
  return secoes;
}
