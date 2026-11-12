/**
 * Divide um texto marcado com linhas `@@ Título` em lotes de poucas seções.
 *
 * A função `ingest-bulk` gera um embedding por trecho dentro de uma única
 * chamada, e o Supabase derruba a chamada (HTTP 546) quando ela gasta mais
 * recursos que o limite. Mandar tudo de uma vez funciona para um capítulo e
 * falha para um livro inteiro. Por isso o painel envia poucas seções por vez.
 *
 * Devolve `null` quando o texto não tem marcas: aí vale o divisor por
 * palavras do servidor, como sempre foi, numa chamada só.
 */

const MARCA = /^@@[ \t]+\S/;

export function dividirEmLotes(texto: string, porLote: number): string[] | null {
  const linhas = texto.replace(/\r\n/g, '\n').split('\n');
  if (!linhas.some(l => MARCA.test(l))) return null;

  // Cada bloco começa numa marca. O que vier antes da primeira marca
  // segue junto com a primeira seção, sem se perder.
  const blocos: string[][] = [];
  let atual: string[] = [];
  let viuMarca = false;
  for (const linha of linhas) {
    if (MARCA.test(linha)) {
      if (viuMarca) {
        blocos.push(atual);
        atual = [];
      }
      viuMarca = true;
    }
    atual.push(linha);
  }
  blocos.push(atual);

  const tamanho = Math.max(1, Math.floor(porLote));
  const lotes: string[] = [];
  for (let i = 0; i < blocos.length; i += tamanho) {
    lotes.push(blocos.slice(i, i + tamanho).map(b => b.join('\n').trim()).join('\n\n'));
  }
  return lotes;
}
