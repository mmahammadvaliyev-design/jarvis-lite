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
}

// Построенный план дня, привязанный к дате.
export interface PlanRecord extends DayPlan {
  date: string; // "YYYY-MM-DD" — первичный ключ
}

export const DEFAULT_PROFILE: Profile = {
  id: "me",
  interests: ["интересные факты", "новые слова", "история слов"],
  wakeTime: "07:30",
  sleepTime: "23:30",
  workStart: "10:00",
  workEnd: "19:00",
};

class JarvisDB extends Dexie {
  tasks!: Table<Task, string>;
  seen!: Table<SeenSuggestion, string>;
  profile!: Table<Profile, string>;
  plans!: Table<PlanRecord, string>;

  constructor() {
    super("jarvis-lite");
    this.version(1).stores({
      tasks: "id, date, status, category",
      seen: "id, date",
      profile: "id",
      plans: "date",
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
  if (p) return p;
  await db.profile.put(DEFAULT_PROFILE);
  return DEFAULT_PROFILE;
}

export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}
