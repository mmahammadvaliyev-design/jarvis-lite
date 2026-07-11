import { PUSH_CONFIGURED, SUPABASE_ANON_KEY, SUPABASE_FUNCTIONS_URL, VAPID_PUBLIC_KEY } from "../config";

export interface PushPrefs {
  water: boolean;
  money: boolean;
}

function urlBase64ToUint8Array(base64: string): BufferSource {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0))).buffer as ArrayBuffer;
}

// Стабильный ID устройства — без аккаунтов, но чтобы сервер знал, кому слать.
export function getDeviceId(): string {
  const KEY = "jarvis-device-id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function pushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window;
}

// Подписывает устройство на push и сообщает бэкенду, какие напоминания включены.
export async function subscribeToPush(prefs: PushPrefs): Promise<boolean> {
  if (!PUSH_CONFIGURED || !pushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ deviceId: getDeviceId(), subscription: sub.toJSON(), timezone, prefs }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
  } catch {
    /* тихо пропускаем */
  }
}
