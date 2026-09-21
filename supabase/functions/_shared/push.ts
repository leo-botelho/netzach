// @ts-ignore — web-push via npm
import webpush from 'npm:web-push@3.6.7';
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Envio de Web Push, compartilhado entre send-push (avisos da Raquel
 * para a base) e responder-duvida (aviso para quem perguntou).
 */

export interface Assinatura { endpoint: string; p256dh: string; auth: string }

export interface Mensagem { title: string; body: string; url?: string }

/**
 * A URL do clique é restrita a caminhos internos: o service worker
 * abre `data.url` sem validar, então uma URL externa aqui viraria
 * phishing dentro do app instalado.
 */
export function caminhoInterno(url: unknown): string {
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) return '/';
  return url;
}

let configurado = false;
function configurar() {
  if (configurado) return;
  webpush.setVapidDetails(
    Deno.env.get('VAPID_EMAIL') ?? 'mailto:admin@netzach.app',
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  );
  configurado = true;
}

const LOTE = 100;

/**
 * Manda para as assinaturas dadas e apaga as que o navegador já
 * descartou (410/404). Em lotes, para não estourar o tempo da função.
 */
export async function enviarParaAssinaturas(
  supabase: SupabaseClient,
  assinaturas: Assinatura[],
  mensagem: Mensagem,
): Promise<{ sent: number; total: number; removidas: number }> {
  if (assinaturas.length === 0) return { sent: 0, total: 0, removidas: 0 };
  configurar();

  const payload = JSON.stringify({ ...mensagem, url: caminhoInterno(mensagem.url) });
  const expirados: string[] = [];
  let sent = 0;

  for (let i = 0; i < assinaturas.length; i += LOTE) {
    const lote = assinaturas.slice(i, i + LOTE);
    const results = await Promise.allSettled(
      lote.map(sub => webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      )),
    );

    results.forEach((r, idx) => {
      if (r.status === 'fulfilled') sent++;
      else if ([410, 404].includes((r.reason as { statusCode?: number })?.statusCode ?? 0)) {
        expirados.push(lote[idx].endpoint);
      }
    });
  }

  for (let i = 0; i < expirados.length; i += LOTE) {
    await supabase.from('push_subscriptions').delete().in('endpoint', expirados.slice(i, i + LOTE));
  }

  return { sent, total: assinaturas.length, removidas: expirados.length };
}

/**
 * Manda para usuárias específicas. Lista vazia não envia nada: ao
 * contrário do send-push, aqui não existe o caminho "sem destino, manda
 * para todas".
 */
export async function enviarParaUsuarias(
  supabase: SupabaseClient,
  userIds: string[],
  mensagem: Mensagem,
) {
  if (userIds.length === 0) return { sent: 0, total: 0, removidas: 0 };

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', userIds);
  if (error) throw error;

  return enviarParaAssinaturas(supabase, (data ?? []) as Assinatura[], mensagem);
}
