import { describe, it, expect } from 'vitest';
import { mensagemDoErroDeSenha, podeTentarDeNovo } from './erroDeSenha';

/**
 * O caso que motivou isto: repetir a senha antiga devolvia "peça um link
 * novo", e quem obedecia voltava com um link fresco para bater na mesma
 * parede. A mensagem precisa dizer o que houve de fato.
 */

describe('mensagemDoErroDeSenha', () => {
  it('avisa quando a senha é a mesma de antes', () => {
    const real = { status: 422, message: 'New password should be different from the old password.' };
    expect(mensagemDoErroDeSenha(real)).toMatch(/já usa hoje/);
    expect(mensagemDoErroDeSenha(real)).not.toMatch(/link/i);
  });

  it('reconhece a senha repetida pelo código, sem depender do inglês', () => {
    expect(mensagemDoErroDeSenha({ code: 'same_password' })).toMatch(/já usa hoje/);
  });

  it('fala de tamanho quando a senha é curta', () => {
    expect(mensagemDoErroDeSenha({ message: 'Password should be at least 8 characters' }))
      .toMatch(/curta/);
  });

  it('avisa sobre senha vista em vazamento', () => {
    expect(mensagemDoErroDeSenha({ message: 'This password is known to be weak and easy to guess' }))
      .toMatch(/vazamentos/);
  });

  it('pede paciência quando são tentativas demais', () => {
    expect(mensagemDoErroDeSenha({ status: 429 })).toMatch(/minutinho/);
  });

  it('aí sim manda pedir link novo, quando a sessão acabou', () => {
    expect(mensagemDoErroDeSenha({ code: 'session_not_found' })).toMatch(/Peça um novo/);
  });

  it('não inventa explicação para erro que não conhece', () => {
    expect(mensagemDoErroDeSenha({ message: 'boom' })).toMatch(/Tente de novo em instantes/);
  });

  it('nenhuma mensagem usa travessão', () => {
    const casos = [
      { code: 'same_password' },
      { code: 'weak_password' },
      { status: 429 },
      { code: 'session_not_found' },
      { message: 'boom' },
    ];
    for (const caso of casos) {
      expect(mensagemDoErroDeSenha(caso)).not.toContain('—');
    }
  });
});

describe('podeTentarDeNovo', () => {
  it('deixa tentar outra senha na mesma tela', () => {
    expect(podeTentarDeNovo({ code: 'same_password' })).toBe(true);
    expect(podeTentarDeNovo({ status: 429 })).toBe(true);
  });

  it('não deixa insistir quando o link acabou', () => {
    expect(podeTentarDeNovo({ code: 'session_not_found' })).toBe(false);
    expect(podeTentarDeNovo({ status: 401 })).toBe(false);
  });
});
