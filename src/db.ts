import Dexie, { type Table } from "dexie";
import type { DayPlan } from "./logic/buildDay";

export type Category =
  | "работа"
  | "учёба"
  | "здоровье"
  | "быт"
  | "финансы"
  | "люди"
  | "саморазвитие"
  | "отдых";

export const CATEGORIES: Category[] = [
  "работа",
  "учёба",
  "здоровье",
  "быт",
  "финансы",
  "люди",
  "саморазвитие",
  "отдых",
];

export type Priority = "high" | "medium" | "low";
export type Energy = "high" | "medium" | "low";
export type TaskStatus = "pending" | "done" | "skipped";

export interface Task {
  id: string;
  title: string;
  category: Category;
  priority: Priority;
  estimateMin: number;
  preferredTime: string | null; // "HH:MM"
  energy: Energy;
  status: TaskStatus;
  date: string; // "YYYY-MM-DD" — какому дню принадлежит задача
  createdAt: string; // ISO
  completedAt: string | null;
  carryCount: number;
}

export type SuggestionKind =
  | "fact"
  | "word"
  | "etymology"
  | "puzzle"
  | "recommendation"
  | "rest";

export interface SeenSuggestion {
  id: string; // <suggestionId>@<date>
  suggestionId: string;
  date: string;
}

export interface Profile {
  id: "me"; // singleton
  interests: string[];
  wakeTime: string; // "HH:MM"
  sleepTime: string; // "HH:MM"
  workStart: string;
  workEnd: string;
  breakEveryMin: number; // микро-перерыв не реже, чем раз в N минут работы (0 = только по ходу)
  wantMovement: boolean; // включать разминку (отжаться/присесть) в перерывы
  notifications: boolean; // разрешены ли браузерные уведомления о перерывах
  moneyReminders: boolean; // напоминать записывать доходы/расходы днём и вечером
  waterReminders: boolean; // напоминать пить воду несколько раз в день
  currency: string; // код валюты для раздела «Бюджет» (AZN, RUB, …)
  demoMode: boolean; // включён ли демо-режим (реальные данные при этом сохранены)
  quitSmoking: boolean; // режим «бросаю курить»
  quitDate: string | null; // дата старта отказа от курения ("YYYY-MM-DD")
}

// Дневные «победы» — тренировки, вода, настроение, устоявшие тяги (для статистики).
export interface Win {
  date: string; // "YYYY-MM-DD" — первичный ключ
  water: number;
  exercises: number;
  mood?: number; // 1..5 — уровень счастья за день
  urges?: number; // сколько раз устоял перед сигаретой
}

export const WATER_GOAL = 8;

// ── Привычки (стрики в духе Duolingo) ─────────────────────────────
export interface Habit {
  id: string;
  title: string;
  createdAt: string;
}

export interface HabitDone {
  id: string; // `${habitId}@${date}`
  habitId: string;
  date: string; // "YYYY-MM-DD"
}

// Рубежи для стрика: после каждого — новая цель.
export const STREAK_MILESTONES = [7, 14, 30, 50, 100, 150, 200, 365];

// Построенный план дня, привязанный к дате.
export interface PlanRecord extends DayPlan {
  date: string; // "YYYY-MM-DD" — первичный ключ
}

// ── Финансы ───────────────────────────────────────────────────────
export type TxnType = "income" | "expense";

export interface Txn {
  id: string;
  type: TxnType;
  amount: number; // в валюте профиля, положительное число
  category: string;
  note: string;
  date: string; // "YYYY-MM-DD"
  createdAt: string;
}

export const EXPENSE_CATEGORIES = [
  "еда",
  "транспорт",
  "жильё",
  "здоровье",
  "развлечения",
  "покупки",
  "связь",
  "прочее",
];
export const INCOME_CATEGORIES = ["зарплата", "подработка", "подарок", "прочее"];

export const CURRENCIES = [
  { code: "AZN", symbol: "₼", label: "Манат" },
  { code: "RUB", symbol: "₽", label: "Рубль" },
  { code: "USD", symbol: "$", label: "Доллар" },
  { code: "EUR", symbol: "€", label: "Евро" },
  { code: "TRY", symbol: "₺", label: "Лира" },
  { code: "KZT", symbol: "₸", label: "Тенге" },
  { code: "UAH", symbol: "₴", label: "Гривна" },
];

export function currencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? "₼";
}

export const DEFAULT_PROFILE: Profile = {
  id: "me",
  interests: ["интересные факты", "новые слова", "английский"],
  wakeTime: "07:30",
  sleepTime: "23:30",
  workStart: "10:00",
  workEnd: "19:00",
  breakEveryMin: 60,
  wantMovement: true,
  notifications: false,
  moneyReminders: true,
  waterReminders: true,
  currency: "AZN",
  demoMode: false,
  quitSmoking: false,
  quitDate: null,
};

class JarvisDB extends Dexie {
  tasks!: Table<Task, string>;
  seen!: Table<SeenSuggestion, string>;
  profile!: Table<Profile, string>;
  plans!: Table<PlanRecord, string>;
  txns!: Table<Txn, string>;
  wins!: Table<Win, string>;
  habits!: Table<Habit, string>;
  habitDone!: Table<HabitDone, string>;

  constructor() {
    super("jarvis-lite");
    this.version(1).stores({
      tasks: "id, date, status, category",
      seen: "id, date",
      profile: "id",
      plans: "date",
    });
    // v2: добавили финансы. Существующие таблицы переносятся автоматически.
    this.version(2).stores({
      txns: "id, date, type, category",
    });
    // v3: дневные «победы» (вода, мини-тренировки).
    this.version(3).stores({
      wins: "date",
    });
    // v4: привычки со стриками.
    this.version(4).stores({
      habits: "id, createdAt",
      habitDone: "id, habitId, date",
    });
  }
}

// Таблицы, которые относятся к «данным дня» (для демо-режима — снапшот/восстановление).
export const DATA_TABLES = ["tasks", "seen", "plans", "txns", "wins", "habits", "habitDone"] as const;

export const db = new JarvisDB();

export function todayStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function nowHHMM(d = new Date()): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export async function getProfile(): Promise<Profile> {
  const p = await db.profile.get("me");
  if (p) return { ...DEFAULT_PROFILE, ...p }; // добавляем поля, которых не было в старых версиях
  await db.profile.put(DEFAULT_PROFILE);
  return DEFAULT_PROFILE;
}

export function money(n: number, symbol = "₼"): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n) + " " + symbol;
}

// Инкремент дневной «победы» (вода, тренировка или устоявшая тяга).
export async function bumpWin(field: "water" | "exercises" | "urges", delta = 1): Promise<void> {
  const date = todayStr();
  const w: Win = (await db.wins.get(date)) ?? { date, water: 0, exercises: 0 };
  w[field] = Math.max(0, (w[field] ?? 0) + delta);
  await db.wins.put(w);
}

// Оценка счастья за день (1..5).
export async function setMood(date: string, mood: number): Promise<void> {
  const w: Win = (await db.wins.get(date)) ?? { date, water: 0, exercises: 0 };
  w.mood = mood;
  await db.wins.put(w);
}

// ── Привычки и стрики ─────────────────────────────────────────────
export async function toggleHabitToday(habitId: string, date = todayStr()): Promise<void> {
  const id = `${habitId}@${date}`;
  const existing = await db.habitDone.get(id);
  if (existing) await db.habitDone.delete(id);
  else await db.habitDone.put({ id, habitId, date });
}

// Стрик: сколько дней подряд привычка выполнена, считая до сегодня.
// День ещё «жив», если выполнен вчера, но сегодня пока нет.
export function streakFromDates(doneDates: Set<string>, today = todayStr()): number {
  const shift = (d: string, n: number) => {
    const x = new Date(d + "T00:00:00");
    x.setDate(x.getDate() + n);
    return todayStr(x);
  };
  let cursor = doneDates.has(today) ? today : shift(today, -1);
  if (!doneDates.has(cursor)) return 0;
  let streak = 0;
  while (doneDates.has(cursor)) {
    streak += 1;
    cursor = shift(cursor, -1);
  }
  return streak;
}

export function nextMilestone(streak: number): number {
  return STREAK_MILESTONES.find((m) => m > streak) ?? streak + 100;
}

export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}
