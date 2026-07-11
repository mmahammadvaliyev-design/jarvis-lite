import type { Priority, Task } from "../db";

export interface PlanBlock {
  start: string; // "HH:MM"
  end: string;
  kind: "task" | "break" | "free";
  taskId?: string;
  label: string;
}

export interface DayPlan {
  blocks: PlanBlock[];
  overflowTaskIds: string[];
  comment: string;
}

export interface BuildContext {
  wakeTime: string;
  sleepTime: string;
  workStart: string;
  workEnd: string;
  now: string; // "HH:MM" — текущее время
}

const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return h * 60 + m;
};
const toHHMM = (min: number): string => {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

// Порядок задач: перенесённые со вчера → по приоритету → по энергии (high раньше) → назначенное время.
function orderTasks(tasks: Task[]): Task[] {
  const energyRank = { high: 0, medium: 1, low: 2 } as const;
  return [...tasks].sort((a, b) => {
    if ((b.carryCount > 0 ? 1 : 0) !== (a.carryCount > 0 ? 1 : 0)) {
      return (b.carryCount > 0 ? 1 : 0) - (a.carryCount > 0 ? 1 : 0);
    }
    if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority]) {
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    }
    if (energyRank[a.energy] !== energyRank[b.energy]) {
      return energyRank[a.energy] - energyRank[b.energy];
    }
    return 0;
  });
}

/**
 * Строит расписание дня из pending-задач.
 * Чистая функция без побочных эффектов — потом легко заменить на вызов Claude.
 */
export function buildDay(tasks: Task[], ctx: BuildContext): DayPlan {
  const pending = tasks.filter((t) => t.status === "pending");
  const dayStart = Math.max(toMin(ctx.wakeTime), toMin(ctx.now));
  const dayEnd = toMin(ctx.sleepTime);

  const blocks: PlanBlock[] = [];
  const overflowTaskIds: string[] = [];
  let cursor = dayStart;
  let sinceBreak = 0; // сколько задач подряд без перерыва
  let lunchDone = false;

  const ordered = orderTasks(pending);

  // Сначала пробуем поставить задачи с явным временем в их слоты (если оно ещё впереди).
  const timed = ordered.filter((t) => t.preferredTime && toMin(t.preferredTime) >= cursor);
  const untimed = ordered.filter((t) => !(t.preferredTime && toMin(t.preferredTime) >= cursor));
  // Задачи с назначенным временем, которое уже прошло, идут в общий поток.

  const timedSorted = [...timed].sort((a, b) => toMin(a.preferredTime!) - toMin(b.preferredTime!));

  // Дробим большой свободный промежуток на несколько окон (≤45 мин, максимум 3),
  // чтобы не показывать «Свободно ~300 мин». Остаток промежутка курсор просто перескочит.
  const pushFree = (from: number, to: number) => {
    let c = from;
    let n = 0;
    while (to - c >= 20 && n < 3) {
      const end = Math.min(c + 45, to);
      blocks.push({ start: toHHMM(c), end: toHHMM(end), kind: "free", label: "Свободно" });
      c = end;
      n += 1;
    }
  };

  // Обед вставляем только когда время естественно подошло к 13:00 (мы уже около обеда),
  // а не «прыжком» с раннего утра — иначе важные задачи уезжают на вторую половину дня.
  const insertLunchIfNeeded = () => {
    if (lunchDone) return;
    const lunch = toMin("13:00");
    const nearLunch = cursor >= lunch - 45 && cursor <= lunch + 30;
    if (nearLunch && cursor + 40 <= dayEnd && lunch >= toMin(ctx.workStart) && lunch <= toMin(ctx.workEnd)) {
      blocks.push({ start: toHHMM(cursor), end: toHHMM(cursor + 40), kind: "break", label: "Обед" });
      cursor += 40;
      sinceBreak = 0;
      lunchDone = true;
    }
  };

  const placeTask = (task: Task): boolean => {
    insertLunchIfNeeded();
    const dur = Math.max(5, task.estimateMin);
    if (cursor + dur > dayEnd) {
      overflowTaskIds.push(task.id);
      return false;
    }
    blocks.push({
      start: toHHMM(cursor),
      end: toHHMM(cursor + dur),
      kind: "task",
      taskId: task.id,
      label: task.title,
    });
    cursor += dur;
    sinceBreak += 1;
    // Перерыв после длинного блока или двух задач подряд.
    if ((dur >= 90 || sinceBreak >= 2) && cursor + 15 <= dayEnd) {
      blocks.push({ start: toHHMM(cursor), end: toHHMM(cursor + 15), kind: "break", label: "Перерыв" });
      cursor += 15;
      sinceBreak = 0;
    }
    return true;
  };

  // Утреннее свободное окно, если день начинается заметно раньше первой задачи.
  const firstAt = timedSorted.length ? toMin(timedSorted[0].preferredTime!) : Infinity;
  if (firstAt - cursor >= 30 && untimed.length > 0) {
    const freeEnd = Math.min(cursor + 30, firstAt);
    blocks.push({ start: toHHMM(cursor), end: toHHMM(freeEnd), kind: "free", label: "Свободно" });
    cursor = freeEnd;
  }

  let ti = 0;
  for (const task of untimed) {
    // Вставляем накопившиеся «временные» задачи, когда до них дошло время.
    while (ti < timedSorted.length && toMin(timedSorted[ti].preferredTime!) <= cursor) {
      placeTask(timedSorted[ti]);
      ti += 1;
    }
    // Если следующая «временная» задача близко — сначала подождём и займём окно.
    if (ti < timedSorted.length) {
      const nextTimed = toMin(timedSorted[ti].preferredTime!);
      const dur = Math.max(5, task.estimateMin);
      if (cursor + dur > nextTimed && nextTimed - cursor >= 10) {
        pushFree(cursor, nextTimed);
        cursor = nextTimed;
        placeTask(timedSorted[ti]);
        ti += 1;
      }
    }
    placeTask(task);
  }
  // Оставшиеся временные задачи.
  while (ti < timedSorted.length) {
    const at = toMin(timedSorted[ti].preferredTime!);
    if (at > cursor) {
      pushFree(cursor, at);
      cursor = at;
    }
    placeTask(timedSorted[ti]);
    ti += 1;
  }

  // Вечернее свободное окно, если день ещё не закончился.
  if (dayEnd - cursor >= 30) {
    blocks.push({ start: toHHMM(cursor), end: toHHMM(cursor + 30), kind: "free", label: "Свободно" });
    cursor += 30;
  }

  // Гарантируем минимум 2 free-окна: если получилось меньше — добавляем в конце.
  let freeCount = blocks.filter((b) => b.kind === "free").length;
  while (freeCount < 2 && dayEnd - cursor >= 20) {
    blocks.push({ start: toHHMM(cursor), end: toHHMM(cursor + 20), kind: "free", label: "Свободно" });
    cursor += 20;
    freeCount += 1;
  }

  const placed = blocks.filter((b) => b.kind === "task").length;
  const comment =
    overflowTaskIds.length > 0
      ? `Запланировано ${placed} задач. ${overflowTaskIds.length} не поместилось — перенесите на завтра или сократите.`
      : `Запланировано ${placed} задач. День собран.`;

  return { blocks, overflowTaskIds, comment };
}
