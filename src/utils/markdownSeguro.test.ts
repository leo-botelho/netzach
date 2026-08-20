import { describe, it, expect } from 'vitest';
import { markdownParaHtml } from './markdownSeguro';

/**
 * A resposta da sacerdotisa vai para o DOM via dangerouslySetInnerHTML,
 * e o conteúdo dela é influenciável pelo que está na base de
 * conhecimento. Se esta função parar de escapar, volta a ser XSS.
 */

/** Tags que a própria função gera. Qualquer outra é intrusa. */
const PERMITIDAS = new Set(['strong', '/strong', 'h3', '/h3', 'br/']);
const tagsDe = (html: string) =>
  [...html.matchAll(/<\s*([^\s>]+)/g)].map(m => m[1].toLowerCase());

describe('markdownParaHtml', () => {
  describe('neutraliza HTML vindo do modelo', () => {
    const ataques: Array<[string, string]> = [
      ['script', '<script>alert(1)</script>'],
      ['imagem com onerror', '<img src=x onerror="alert(1)">'],
      ['iframe', '<iframe src="https://exemplo.invalido"></iframe>'],
      ['link javascript:', '<a href="javascript:alert(1)">clique</a>'],
      ['svg com onload', '<svg/onload=alert(1)>'],
      ['tag de fechamento solta', '</strong><script>alert(1)</script>'],
      ['atributo com aspas simples', "<div class='x' onclick='alert(1)'>oi</div>"],
    ];

    it.each(ataques)('%s não produz tag no resultado', (_nome, entrada) => {
      const saida = markdownParaHtml(entrada);
      const intrusas = tagsDe(saida).filter(t => !PERMITIDAS.has(t));
      expect(intrusas).toEqual([]);
    });

    it('escapa os caracteres perigosos em vez de removê-los', () => {
      const saida = markdownParaHtml('<script>');
      expect(saida).toBe('&lt;script&gt;');
      expect(saida).not.toContain('<script');
    });

    it('escapa o & antes das demais entidades, sem duplicar', () => {
      expect(markdownParaHtml('a & b')).toBe('a &amp; b');
      expect(markdownParaHtml('&lt;')).toBe('&amp;lt;');
    });
  });

  describe('mantém a formatação legítima', () => {
    it('converte negrito', () => {
      expect(markdownParaHtml('Use **lavanda** hoje'))
        .toBe('Use <strong>lavanda</strong> hoje');
    });

    it('converte título com a classe da identidade', () => {
      const saida = markdownParaHtml('# Banho de Rosas');
      expect(saida).toContain('<h3 class="font-mystic text-netzach-gold mt-4 mb-1">Banho de Rosas</h3>');
    });

    it('quebra linha antes de item numerado', () => {
      expect(markdownParaHtml('1. Ferva a água')).toBe('<br/>1. Ferva a água');
    });

    it('preserva acentuação', () => {
      expect(markdownParaHtml('intenção e coração')).toBe('intenção e coração');
    });

    it('não altera texto comum', () => {
      const texto = 'Que tal uma gotinha de lavanda no travesseiro hoje?';
      expect(markdownParaHtml(texto)).toBe(texto);
    });

    it('lida com texto vazio', () => {
      expect(markdownParaHtml('')).toBe('');
    });
  });

  it('negrito com HTML dentro continua inerte', () => {
    const saida = markdownParaHtml('**<img src=x onerror=alert(1)>**');
    expect(saida).toContain('<strong>');
    expect(tagsDe(saida).filter(t => !PERMITIDAS.has(t))).toEqual([]);
  });
});
