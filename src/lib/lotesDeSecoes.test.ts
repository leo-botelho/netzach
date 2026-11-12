import { describe, it, expect } from 'vitest';
import { dividirEmLotes } from './lotesDeSecoes';

const secoes = (n: number) => Array.from({ length: n }, (_, i) => `@@ Planta ${i + 1}\nTexto da planta ${i + 1}.`).join('\n\n');

describe('dividirEmLotes', () => {
  it('devolve null sem marcas, para o servidor dividir por palavras', () => {
    expect(dividirEmLotes('Um capítulo comum.\n\nOutro parágrafo.', 6)).toBeNull();
  });

  it('agrupa as seções em lotes do tamanho pedido, sem perder nenhuma', () => {
    const lotes = dividirEmLotes(secoes(14), 6)!;
    expect(lotes).toHaveLength(3);
    expect(lotes.map(l => (l.match(/^@@ /gm) ?? []).length)).toEqual([6, 6, 2]);
    expect(lotes.join('\n\n')).toContain('@@ Planta 14');
  });

  it('nunca corta uma seção ao meio: cada lote começa numa marca', () => {
    for (const lote of dividirEmLotes(secoes(20), 7)!) expect(lote.startsWith('@@ ')).toBe(true);
  });

  it('mantém o texto que vem antes da primeira marca junto com a primeira seção', () => {
    const lotes = dividirEmLotes('Abertura solta\n@@ A\nCorpo A\n@@ B\nCorpo B', 1)!;
    expect(lotes).toHaveLength(2);
    expect(lotes[0]).toContain('Abertura solta');
    expect(lotes[0]).toContain('@@ A');
    expect(lotes[1]).toBe('@@ B\nCorpo B');
  });

  it('aceita quebras de linha do Windows', () => {
    expect(dividirEmLotes('@@ A\r\nx\r\n@@ B\r\ny', 1)).toEqual(['@@ A\nx', '@@ B\ny']);
  });

  it('trata lote menor que 1 como 1', () => {
    expect(dividirEmLotes(secoes(3), 0)).toHaveLength(3);
  });
});
