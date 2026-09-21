import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;
const LS_KEY = 'netzach_push_subscribed';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function lerLocal(): boolean {
  try { return localStorage.getItem(LS_KEY) === '1'; } catch { return false; }
}
function gravarLocal(ativo: boolean) {
  try { localStorage.setItem(LS_KEY, ativo ? '1' : '0'); } catch { /* navegação privada */ }
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  // Começa com o que ficou guardado, para o botão não piscar ao abrir.
  const [isSubscribed, setIsSubscribed] = useState(lerLocal);
  const [isLoading, setIsLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  /**
   * Conta as ações da usuária (ativar, desativar). A checagem ao abrir a
   * tela é assíncrona e no iPhone pode demorar; se ela voltar depois de a
   * usuária ter ativado, trazia o "inativo" de antes e desmarcava o botão.
   * Resposta de checagem mais velha que a última ação é descartada.
   */
  const acoes = useRef(0);

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    if (!supported) return;

    setPermission(Notification.permission);

    const acoesNoInicio = acoes.current;
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => {
        if (acoes.current !== acoesNoInicio) return;
        const active = !!sub;
        setIsSubscribed(active);
        gravarLocal(active);
      })
      .catch(() => {});
  }, []);

  const subscribe = async (): Promise<boolean> => {
    if (!isSupported || !VAPID_PUBLIC_KEY) return false;
    acoes.current += 1;
    setIsLoading(true);
    setErro(null);

    let subscription: PushSubscription | null = null;
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;

      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });

      const { endpoint, keys } = subscription.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('sem sessão');

      // Antes o erro daqui era ignorado: o botão dizia "ativas" e o
      // servidor não sabia do aparelho, então nada chegava.
      const { error } = await supabase.from('push_subscriptions').upsert(
        { user_id: session.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
        { onConflict: 'user_id,endpoint' }
      );
      if (error) throw new Error(error.message);

      setIsSubscribed(true);
      gravarLocal(true);
      return true;
    } catch (err) {
      console.error('Push subscription error:', err instanceof Error ? err.message : err);
      // Sem registro no servidor a inscrição no aparelho não serve: desfaz,
      // para o botão não mentir.
      await subscription?.unsubscribe().catch(() => {});
      setIsSubscribed(false);
      gravarLocal(false);
      setErro('Não consegui ativar as notificações agora. Tente de novo em instantes.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async (): Promise<void> => {
    acoes.current += 1;
    setIsLoading(true);
    setErro(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();

      if (subscription) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { error } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', session.user.id)
            .eq('endpoint', subscription.endpoint);
          if (error) console.error('Falha ao remover a inscrição no servidor:', error.message);
        }
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      gravarLocal(false);
    } finally {
      setIsLoading(false);
    }
  };

  return { isSupported, permission, isSubscribed, isLoading, erro, subscribe, unsubscribe };
}
