import { db, todayStr, uid, type Category, type Task } from "./db";

const CATS: Category[] = ["работа", "здоровье", "быт", "люди", "саморазвитие", "учёба"];

function shift(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return todayStr(d);
}

// Заполняет последние 7 дней (кроме сегодня) правдоподобными данными для проверки статистики.
export async function seedWeek() {
  const rows: Task[] = [];
  for (let i = 7; i >= 1; i--) {
    const date = shift(-i);
    const count = 3 + Math.floor(Math.random() * 4); // 3–6 задач в день
    for (let j = 0; j < count; j++) {
      const cat = CATS[Math.floor(Math.random() * CATS.length)];
      const done = Math.random() < 0.7; // ~70% выполняется
      rows.push({
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
  await db.tasks.bulkPut(rows);
}

export async function clearAll() {
  await db.tasks.clear();
  await db.plans.clear();
  await db.seen.clear();
  await db.txns.clear();
  await db.wins.clear();
}
