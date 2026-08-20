import { supabase } from './supabase';

/**
 * Registra uma falha da interface no próprio Supabase.
 *
 * Sem isto, um erro no celular de uma assinante morre na tela dela.
 * Fica em São Paulo, junto com o resto do banco: nenhum dado sai do
 * país e não há serviço externo envolvido.
 *
 * Nunca lança: uma falha ao registrar a falha não pode virar um
 * segundo problema.
 */
export async function registrarErro(
  erro: unknown,
  origem?: string,
  detalhes?: string
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    await supabase.from('error_logs').insert({
      user_id: session?.user.id ?? null,
      mensagem: erro instanceof Error ? erro.message : String(erro),
      origem: origem ?? null,
      rota: window.location.pathname,
      navegador: navigator.userAgent.slice(0, 300),
      // A pilha ajuda a reproduzir; o trecho basta e evita guardar
      // texto gigante.
      detalhes: (detalhes ?? (erro instanceof Error ? erro.stack : ''))?.slice(0, 2000) || null,
    });
  } catch {
    // Silêncio proposital.
  }
}
