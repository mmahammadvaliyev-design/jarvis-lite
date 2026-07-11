import type { Task } from "../db";
import { todayStr, uid } from "../db";
import { DEFAULT_ESTIMATE, detectCategory, detectEnergy, detectPriority } from "./keywords";

// Черновик задачи из парсера — до сохранения пользователь может его отредактировать.
export type TaskDraft = Omit<Task, "id" | "status" | "createdAt" | "completedAt" | "carryCount" | "date">;

// Распознаём время: "в 14", "в 14:30", "к 9", "утром", "днём", "вечером", "после обеда".
function detectTime(text: string): string | null {
  const t = text.toLowerCase();

  const exact = t.match(/(?:в|к)\s*(\d{1,2})[:.](\d{2})/);
  if (exact) {
    const h = Math.min(23, parseInt(exact[1], 10));
    const m = Math.min(59, parseInt(exact[2], 10));
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  const hourOnly = t.match(/(?:в|к)\s*(\d{1,2})(?:\s*час|(?=\s|$))/);
  if (hourOnly) {
    const h = Math.min(23, parseInt(hourOnly[1], 10));
    return `${String(h).padStart(2, "0")}:00`;
  }
  if (/после обеда/.test(t)) return "13:30";
  if (/утром/.test(t)) return "09:00";
  if (/днём|днем/.test(t)) return "14:00";
  if (/вечером/.test(t)) return "19:00";
  return null;
}

// Длительность: "30 мин", "полчаса", "2 часа", "час".
function detectEstimate(text: string): number | null {
  const t = text.toLowerCase();
  if (/полчаса/.test(t)) return 30;
  const mins = t.match(/(\d{1,3})\s*(?:мин|минут)/);
  if (mins) return parseInt(mins[1], 10);
  const hours = t.match(/(\d{1,2})\s*час/);
  if (hours) return parseInt(hours[1], 10) * 60;
  if (/(?:^|\s)час(?:\s|$|а|ов|ик)/.test(t)) return 60;
  return null;
}

// Чистим строку от служебных слов времени/приоритета, чтобы заголовок был опрятным.
function cleanTitle(raw: string): string {
  let s = raw.trim().replace(/\s+/g, " ");
  s = s.replace(/^[-–—•*·\d.)\s]+/, ""); // маркеры списка в начале
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Разбирает многострочный ввод: одна непустая строка = одна задача.
export function parseTasks(input: string): TaskDraft[] {
  const lines = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return lines.map((line) => {
    const category = detectCategory(line);
    const priority = detectPriority(line);
    const energy = detectEnergy(line, category);
    const estimateMin = detectEstimate(line) ?? DEFAULT_ESTIMATE[category];
    const preferredTime = detectTime(line);
    return {
      title: cleanTitle(line),
      category,
      priority,
      estimateMin,
      preferredTime,
      energy,
    };
  });
}

// Превращает черновик в полноценную задачу для сохранения в БД.
export function draftToTask(d: TaskDraft, date = todayStr()): Task {
  return {
    id: uid(),
    title: d.title,
    category: d.category,
    priority: d.priority,
    estimateMin: d.estimateMin,
    preferredTime: d.preferredTime,
    energy: d.energy,
    status: "pending",
    date,
    createdAt: new Date().toISOString(),
    completedAt: null,
    carryCount: 0,
  };
}
