import {
  DATA_TABLES,
  db,
  getProfile,
  todayStr,
  uid,
  type Category,
  type Habit,
  type HabitDone,
  type Task,
  type Txn,
  type Win,
} from "./db";

const CATS: Category[] = ["работа", "здоровье", "быт", "люди", "саморазвитие", "учёба"];

function shift(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return todayStr(d);
}

const SNAPSHOT_KEY = "jarvis-real-snapshot";

// Наполняет приложение правдоподобными демо-данными (задачи, бюджет, вода, привычка со стриком).
export async function seedDemoData() {
  const today = todayStr();

  // Задачи за неделю (кроме сегодня) + пара на сегодня.
  const tasks: Task[] = [];
  for (let i = 7; i >= 0; i--) {
    const date = shift(-i);
    const count = i === 0 ? 3 : 3 + Math.floor(Math.random() * 4);
    for (let j = 0; j < count; j++) {
      const cat = CATS[Math.floor(Math.random() * CATS.length)];
      const done = i === 0 ? j < 2 : Math.random() < 0.75;
      tasks.push({
        id: uid(),
        title: `Задача ${cat} #${j + 1}`,
        category: cat,
        priority: "medium",
        estimateMin: [20, 30, 45, 60, 90][Math.floor(Math.random() * 5)],
        preferredTime: null,
        energy: "medium",
        status: done ? "done" : "pending",
        date,
        createdAt: new Date().toISOString(),
        completedAt: done ? new Date().toISOString() : null,
        carryCount: 0,
      });
    }
  }
  await db.tasks.bulkPut(tasks);

  // Бюджет за месяц.
  const txns: Txn[] = [
    { id: uid(), type: "income", amount: 50000, category: "зарплата", note: "", date: shift(-3), createdAt: new Date().toISOString() },
    { id: uid(), type: "income", amount: 8000, category: "подработка", note: "", date: shift(-1), createdAt: new Date().toISOString() },
    { id: uid(), type: "expense", amount: 1200, category: "еда", note: "обед", date: today, createdAt: new Date().toISOString() },
    { id: uid(), type: "expense", amount: 800, category: "транспорт", note: "", date: shift(-1), createdAt: new Date().toISOString() },
    { id: uid(), type: "expense", amount: 3500, category: "покупки", note: "", date: shift(-2), createdAt: new Date().toISOString() },
    { id: uid(), type: "expense", amount: 900, category: "связь", note: "", date: shift(-4), createdAt: new Date().toISOString() },
  ];
  await db.txns.bulkPut(txns);

  // Вода / тренировки / настроение за неделю.
  const wins: Win[] = [];
  for (let i = 7; i >= 0; i--) {
    wins.push({
      date: shift(-i),
      water: 4 + Math.floor(Math.random() * 5),
      exercises: 1 + Math.floor(Math.random() * 4),
      mood: 3 + Math.floor(Math.random() * 3),
    });
  }
  await db.wins.bulkPut(wins);

  // Привычка «Английский» со стриком в 78 дней.
  const habit: Habit = { id: uid(), title: "Английский", createdAt: shift(-80) };
  await db.habits.put(habit);
  const done: HabitDone[] = [];
  for (let i = 77; i >= 0; i--) {
    const date = shift(-i);
    done.push({ id: `${habit.id}@${date}`, habitId: habit.id, date });
  }
  await db.habitDone.bulkPut(done);
}

async function clearData() {
  for (const t of DATA_TABLES) await (db as any)[t].clear();
}

// Включает демо-режим: сохраняет реальные данные и подменяет их демо-набором.
export async function enableDemo() {
  const profile = await getProfile();
  if (profile.demoMode) return;
  // снимок реальных данных
  const snap: Record<string, unknown[]> = {};
  for (const t of DATA_TABLES) snap[t] = await (db as any)[t].toArray();
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap));
  await clearData();
  await seedDemoData();
  await db.profile.put({ ...profile, demoMode: true });
}

// Выключает демо-режим: удаляет демо-данные и возвращает реальные.
export async function disableDemo() {
  const profile = await getProfile();
  await clearData();
  const raw = localStorage.getItem(SNAPSHOT_KEY);
  if (raw) {
    const snap = JSON.parse(raw) as Record<string, unknown[]>;
    for (const t of DATA_TABLES) {
      const rows = snap[t] ?? [];
      if (rows.length) await (db as any)[t].bulkPut(rows);
    }
    localStorage.removeItem(SNAPSHOT_KEY);
  }
  await db.profile.put({ ...profile, demoMode: false });
}

// Полная очистка (для настроек).
export async function clearAll() {
  await clearData();
  localStorage.removeItem(SNAPSHOT_KEY);
}
