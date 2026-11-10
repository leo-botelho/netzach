// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { cifrar, decifrar, segredoDeCifraValido } from './cifra';

/**
 * As chaves de API cadastradas no painel ficam no banco. Estes testes
 * fixam o que protege essas chaves: quem lê o banco não as lê, e um
 * valor adulterado ou trocado de lugar não abre.
 */

const SEGREDO = 'segredo-de-teste-com-mais-de-24-caracteres';
const CHAVE = 'sk-proj-ChaveDeTesteQueNaoExiste1234567890';

describe('cifra das chaves', () => {
  it('cifra e decifra de volta o mesmo texto', async () => {
    const guardado = await cifrar(CHAVE, SEGREDO, 'openai');
    expect(await decifrar(guardado, SEGREDO, 'openai')).toBe(CHAVE);
  });

  it('o valor guardado não contém a chave', async () => {
    const guardado = await cifrar(CHAVE, SEGREDO, 'openai');
    expect(guardado).not.toContain('sk-proj');
    expect(guardado).not.toContain(CHAVE.slice(8, 20));
    expect(guardado.startsWith('v1.')).toBe(true);
  });

  it('a mesma chave cifrada duas vezes dá valores diferentes', async () => {
    const a = await cifrar(CHAVE, SEGREDO, 'openai');
    const b = await cifrar(CHAVE, SEGREDO, 'openai');
    expect(a).not.toBe(b);
  });

  it('com o segredo errado não abre', async () => {
    const guardado = await cifrar(CHAVE, SEGREDO, 'openai');
    await expect(decifrar(guardado, 'outro-segredo-tambem-bem-comprido-ok', 'openai')).rejects.toThrow();
  });

  it('um valor cifrado para uma plataforma não abre na linha de outra', async () => {
    const guardado = await cifrar(CHAVE, SEGREDO, 'openai');
    await expect(decifrar(guardado, SEGREDO, 'gemini')).rejects.toThrow();
  });

  it('um valor adulterado não abre', async () => {
    const guardado = await cifrar(CHAVE, SEGREDO, 'openai');
    const partes = guardado.split('.');
    // Troca um caractere do texto cifrado.
    const c = partes[2];
    partes[2] = (c[0] === 'A' ? 'B' : 'A') + c.slice(1);
    await expect(decifrar(partes.join('.'), SEGREDO, 'openai')).rejects.toThrow();
  });

  it('recusa um formato que não é o nosso', async () => {
    await expect(decifrar('qualquer-coisa', SEGREDO, 'openai')).rejects.toThrow(/Formato/);
  });

  it('recusa cifrar com segredo curto ou ausente', async () => {
    await expect(cifrar(CHAVE, 'curto', 'openai')).rejects.toThrow(/Segredo/);
    await expect(cifrar(CHAVE, '', 'openai')).rejects.toThrow(/Segredo/);
  });

  it('aceita chaves longas e com símbolos', async () => {
    const longa = 'AIzaSy' + 'x'.repeat(300) + '_-Z';
    expect(await decifrar(await cifrar(longa, SEGREDO, 'gemini'), SEGREDO, 'gemini')).toBe(longa);
  });
});

describe('segredoDeCifraValido', () => {
  it('exige ao menos 24 caracteres', () => {
    expect(segredoDeCifraValido(undefined)).toBe(false);
    expect(segredoDeCifraValido('curto')).toBe(false);
    expect(segredoDeCifraValido('x'.repeat(23))).toBe(false);
    expect(segredoDeCifraValido('x'.repeat(24))).toBe(true);
  });
});
