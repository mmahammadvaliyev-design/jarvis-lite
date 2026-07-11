import type { DayPlan } from "./buildDay";
import { buildBreakBundle } from "../content/suggestions";
import { currencySymbol, db, getProfile, money, todayStr } from "../db";

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

// ── Напоминания о бюджете (днём и вечером) ────────────────────────
let moneyTimers: number[] = [];
export const MONEY_REMINDER_TIMES = ["14:00", "20:00"];

export function clearMoneyReminders() {
  moneyTimers.forEach((t) => clearTimeout(t));
  moneyTimers = [];
}

async function fireMoneyReminder() {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  const today = todayStr();
  const txns = await db.txns.where("date").equals(today).toArray();
  const profile = await getProfile();
  const sym = currencySymbol(profile.currency);
  const income = txns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = txns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const body =
    txns.length === 0
      ? "Не забудь записать, сколько сегодня заработал и потратил — это важно для бюджета."
      : `Сегодня записано: +${money(income, sym)} / −${money(expense, sym)}. Всё внёс? Допиши, что забыл.`;
  try {
    new Notification("Джарвис · бюджет", { body, icon: "./icon.svg", tag: "jarvis-money" });
  } catch {
    /* Notification может требовать service worker — тихо пропускаем */
  }
}

// Планирует напоминания о бюджете на ближайшие моменты (днём и вечером) — пока приложение открыто.
export function scheduleMoneyReminders() {
  clearMoneyReminders();
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (const t of MONEY_REMINDER_TIMES) {
    const at = toMin(t);
    if (at <= nowMin) continue;
    const delayMs = (at - nowMin) * 60_000 - now.getSeconds() * 1000;
    if (delayMs <= 0 || delayMs > 14 * 60 * 60_000) continue;
    const id = window.setTimeout(fireMoneyReminder, delayMs);
    moneyTimers.push(id);
  }
}

// ── Напоминания пить воду (несколько раз в день) ──────────────────
let waterTimers: number[] = [];
export const WATER_REMINDER_TIMES = ["10:00", "13:00", "16:00", "19:00"];
const WATER_LINES = [
  "Время попить воды 💧 Пара глотков — и голова свежее.",
  "Глоток воды — маленькая забота о себе 💧 Сделай прямо сейчас.",
  "Не забывай про воду 💧 Тело скажет спасибо.",
];

export function clearWaterReminders() {
  waterTimers.forEach((t) => clearTimeout(t));
  waterTimers = [];
}

function fireWater() {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  const body = WATER_LINES[Math.floor(Math.random() * WATER_LINES.length)];
  try {
    new Notification("Джарвис · вода", { body, icon: "./icon.svg", tag: "jarvis-water" });
  } catch {
    /* тихо пропускаем */
  }
}

export function scheduleWaterReminders() {
  clearWaterReminders();
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (const t of WATER_REMINDER_TIMES) {
    const at = toMin(t);
    if (at <= nowMin) continue;
    const delayMs = (at - nowMin) * 60_000 - now.getSeconds() * 1000;
    if (delayMs <= 0 || delayMs > 14 * 60 * 60_000) continue;
    waterTimers.push(window.setTimeout(fireWater, delayMs));
  }
}
