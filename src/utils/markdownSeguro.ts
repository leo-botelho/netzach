/**
 * Converte a resposta da sacerdotisa em HTML para exibição.
 *
 * As seis telas de consulta jogavam o texto do modelo direto no DOM
 * via dangerouslySetInnerHTML, aplicando só três substituições de
 * markdown. Qualquer tag que viesse na resposta era executada — e a
 * resposta é influenciável pelo conteúdo da base de conhecimento.
 *
 * Aqui o texto é escapado primeiro. Depois disso, as únicas tags no
 * resultado são as que esta função gera.
 */
export function markdownParaHtml(texto: string): string {
  const escapado = texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  return escapado
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^(\d+\.\s)/gm, '<br/>$1')
    .replace(/^#+ (.*)/gm, '<h3 class="font-mystic text-netzach-gold mt-4 mb-1">$1</h3>');
}
