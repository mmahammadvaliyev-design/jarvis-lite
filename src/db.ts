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
  currency: string; // код валюты для раздела «Деньги» (AZN, RUB, …)
}

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
  currency: "AZN",
};

class JarvisDB extends Dexie {
  tasks!: Table<Task, string>;
  seen!: Table<SeenSuggestion, string>;
  profile!: Table<Profile, string>;
  plans!: Table<PlanRecord, string>;
  txns!: Table<Txn, string>;

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
  }
}

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

export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}
