import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;
const LS_KEY = 'netzach_push_subscribed';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  // Inicia com o valor do localStorage para evitar flash ao scroll no iOS
  const [isSubscribed, setIsSubscribed] = useState(() => localStorage.getItem(LS_KEY) === '1');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    if (!supported) return;

    setPermission(Notification.permission);

    // Confirma com o browser e sincroniza — não pisca pois localStorage já deu o estado inicial
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription()
    ).then(sub => {
      const active = !!sub;
      setIsSubscribed(active);
      localStorage.setItem(LS_KEY, active ? '1' : '0');
    }).catch(() => {});
  }, []);

  const subscribe = async (): Promise<boolean> => {
    if (!isSupported || !VAPID_PUBLIC_KEY) return false;
    setIsLoading(true);

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;

      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });

      const { endpoint, keys } = subscription.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      await supabase.from('push_subscriptions').upsert(
        { user_id: session.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
        { onConflict: 'user_id,endpoint' }
      );

      setIsSubscribed(true);
      localStorage.setItem(LS_KEY, '1');
      return true;
    } catch (err) {
      console.error('Push subscription error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async (): Promise<void> => {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (!subscription) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', session.user.id)
        .eq('endpoint', subscription.endpoint);
    }

    await subscription.unsubscribe();
    setIsSubscribed(false);
    localStorage.setItem(LS_KEY, '0');
  };

  return { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe };
}
