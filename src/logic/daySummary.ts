import type { Task } from "../db";

export interface WeekPoint {
  date: string;
  planned: number;
  done: number;
}

/**
 * Вечерний итог из фактов — без выдуманных процентов.
 * Чистая функция: потом можно заменить на вызов Claude тем же входом.
 */
export function daySummary(tasks: Task[], week: WeekPoint[]): string {
  const planned = tasks.length;
  const done = tasks.filter((t) => t.status === "done");
  const undone = tasks.filter((t) => t.status !== "done");

  const parts: string[] = [];

  if (planned === 0) {
    return "На сегодня задач не было. Завтра утром закинь план — и поехали.";
  }

  parts.push(`Сделано ${done.length} из ${planned}.`);

  // Похвала за конкретное: первая выполненная важная/энергозатратная задача.
  const highlight =
    done.find((t) => t.priority === "high") ??
    done.find((t) => t.energy === "high") ??
    done[0];
  if (highlight) {
    parts.push(`Отдельно — что закрыл «${highlight.title.toLowerCase()}».`);
  }

  if (undone.length > 0) {
    const titles = undone.map((t) => t.title.toLowerCase()).join(", ");
    parts.push(`Осталось на потом: ${titles}.`);
    const stuck = undone.find((t) => t.carryCount >= 2);
    if (stuck) {
      parts.push(
        `«${stuck.title.toLowerCase()}» висит уже несколько дней — может, разбить на шаги, сократить или честно удалить?`,
      );
    }
  } else if (done.length > 0) {
    parts.push("Всё запланированное закрыто — чистый день.");
  }

  // Наблюдение по неделе: серия дней с ≥1 выполненной задачей.
  const streak = currentStreak(week);
  if (streak >= 3) {
    parts.push(`И уже ${streak} ${plural(streak, "день", "дня", "дней")} подряд закрываешь хотя бы одну задачу — держи ритм.`);
  }

  return parts.join(" ");
}

export function currentStreak(week: WeekPoint[]): number {
  // week отсортирован по возрастанию даты; считаем подряд идущие дни с done>0 с конца.
  let streak = 0;
  for (let i = week.length - 1; i >= 0; i--) {
    if (week[i].done > 0) streak += 1;
    else break;
  }
  return streak;
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
