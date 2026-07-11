import type { DayPlan } from "./buildDay";
import { buildBreakBundle } from "../content/suggestions";

// Браузерные уведомления о перерывах. Важное ограничение: срабатывают только
// пока приложение открыто (вкладка или установленная PWA запущены). Уведомления
// при полностью закрытом приложении требуют push-сервера — вне бесплатной версии.

let timers: number[] = [];

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotifPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const res = await Notification.requestPermission();
  return res === "granted";
}

export function clearBreakNotifications() {
  timers.forEach((t) => clearTimeout(t));
  timers = [];
}

const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return h * 60 + m;
};

function fireBreak(windowMinutes: number, wantMovement: boolean) {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  const b = buildBreakBundle([], wantMovement);
  const lines: string[] = [];
  if (b.fact) lines.push(`💡 ${b.fact.title}`);
  if (b.word) lines.push(`📖 ${b.word.title}`);
  if (b.movement) lines.push(`🏃 ${b.movement}`);
  try {
    new Notification(`Пора передохнуть · ${windowMinutes} мин`, {
      body: lines.join("\n"),
      icon: "./icon.svg",
      tag: "jarvis-break",
    });
  } catch {
    /* некоторые браузеры требуют service worker для Notification — тихо пропускаем */
  }
}

/**
 * Планирует уведомления на все будущие перерывы сегодняшнего плана.
 * Вызывать при открытии дня и после перестроения плана.
 */
export function scheduleBreakNotifications(plan: DayPlan, wantMovement: boolean) {
  clearBreakNotifications();
  if (!notificationsSupported() || Notification.permission !== "granted") return;

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  for (const b of plan.blocks) {
    if (b.kind !== "free" && b.kind !== "break") continue;
    const startMin = toMin(b.start);
    if (startMin <= nowMin) continue; // прошедшие пропускаем
    const delayMs = (startMin - nowMin) * 60_000 - now.getSeconds() * 1000;
    if (delayMs <= 0 || delayMs > 14 * 60 * 60_000) continue; // не дальше ~14 часов вперёд
    const winMin = Math.max(5, toMin(b.end) - startMin);
    const id = window.setTimeout(() => fireBreak(winMin, wantMovement), delayMs);
    timers.push(id);
  }
}
