/**
 * Traduz o erro do Supabase para algo que a usuária consiga agir.
 *
 * A mensagem única de antes ("peça um link novo") mandava recomeçar do zero
 * mesmo quando o link estava bom e o problema era outro, como repetir a senha
 * antiga. Quem seguia o conselho pedia link novo, tentava a mesma senha, e
 * batia na mesma parede.
 */

export type ErroDeAuth = {
  code?: string;
  message?: string;
  status?: number;
};

/** Se dá para tentar outra senha agora, sem sair da tela. */
export function podeTentarDeNovo(erro: ErroDeAuth): boolean {
  return chave(erro) !== 'sessao';
}

export function mensagemDoErroDeSenha(erro: ErroDeAuth): string {
  switch (chave(erro)) {
    case 'repetida':
      return 'Essa é a senha que você já usa hoje. Escolha uma diferente para seguir.';
    case 'fraca':
      return 'Essa senha é fácil de adivinhar. Misture letras, números e um símbolo.';
    case 'curta':
      return 'Essa senha é curta demais. Use pelo menos 8 caracteres.';
    case 'vazada':
      return 'Essa senha já apareceu em vazamentos por aí, então não protege sua conta. Escolha outra.';
    case 'muitas':
      return 'Foram muitas tentativas seguidas. Espere um minutinho e tente de novo.';
    case 'sessao':
      return 'O link já foi usado ou passou da validade. Peça um novo e tente outra vez.';
    default:
      return 'Não consegui guardar a nova senha agora. Tente de novo em instantes.';
  }
}

type Chave = 'repetida' | 'fraca' | 'curta' | 'vazada' | 'muitas' | 'sessao' | 'outro';

/**
 * O `code` é o caminho confiável, mas nem toda resposta traz um. Quando falta,
 * sobra a mensagem em inglês, que é o que o Supabase manda hoje.
 */
function chave(erro: ErroDeAuth): Chave {
  const codigo = erro.code ?? '';
  const texto = (erro.message ?? '').toLowerCase();

  if (codigo === 'same_password' || texto.includes('should be different')) return 'repetida';
  if (texto.includes('known to be weak') || texto.includes('pwned') || texto.includes('data breach')) return 'vazada';
  if (texto.includes('at least') || texto.includes('too short')) return 'curta';
  if (codigo === 'weak_password') return 'fraca';
  if (codigo === 'over_request_rate_limit' || erro.status === 429) return 'muitas';
  if (
    codigo === 'session_not_found' ||
    codigo === 'session_expired' ||
    erro.status === 401 ||
    texto.includes('session')
  ) {
    return 'sessao';
  }

  return 'outro';
}
