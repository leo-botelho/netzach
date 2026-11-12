import { describe, it, expect } from 'vitest';
import { dividirEmSecoes } from './secoes';

describe('dividirEmSecoes', () => {
  it('devolve null quando não há marca, para manter o divisor por palavras', () => {
    expect(dividirEmSecoes('Um texto\n\ncomum sem marcas.')).toBeNull();
  });

  it('cria uma seção por marca, com título e corpo', () => {
    const r = dividirEmSecoes('@@ Alecrim\nAlecrim (Rosmarinus)\nFunção: A.\n\n@@ Arruda\nArruda (Ruta)\nFunção: B.');
    expect(r).toEqual([
      { titulo: 'Alecrim', texto: 'Alecrim (Rosmarinus)\nFunção: A.' },
      { titulo: 'Arruda', texto: 'Arruda (Ruta)\nFunção: B.' },
    ]);
  });

  it('aceita quebras de linha do Windows e espaços sobrando', () => {
    const r = dividirEmSecoes('@@ Alecrim  \r\nCorpo um\r\n@@ Arruda\r\nCorpo dois\r\n');
    expect(r?.map(s => s.titulo)).toEqual(['Alecrim', 'Arruda']);
    expect(r?.[0].texto).toBe('Corpo um');
  });

  it('ignora seção sem corpo', () => {
    const r = dividirEmSecoes('@@ Vazia\n\n@@ Cheia\nTexto');
    expect(r).toEqual([{ titulo: 'Cheia', texto: 'Texto' }]);
  });

  it('guarda o texto anterior à primeira marca como seção sem título', () => {
    const r = dividirEmSecoes('Abertura\n@@ A\nCorpo');
    expect(r).toEqual([{ titulo: '', texto: 'Abertura' }, { titulo: 'A', texto: 'Corpo' }]);
  });

  it('não confunde @@ no meio da linha, nem sem espaço, com marca', () => {
    expect(dividirEmSecoes('contato@@empresa\n@@semespaço')).toBeNull();
  });
});
