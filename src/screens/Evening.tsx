import { useLiveQuery } from "dexie-react-hooks";
import { db, todayStr, type Task } from "../db";
import { daySummary, type WeekPoint } from "../logic/daySummary";

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return todayStr(d);
}

async function weekPoints(endDate: string): Promise<WeekPoint[]> {
  const points: WeekPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = shiftDate(endDate, -i);
    const dayTasks = await db.tasks.where("date").equals(date).toArray();
    points.push({
      date,
      planned: dayTasks.length,
      done: dayTasks.filter((t) => t.status === "done").length,
    });
  }
  return points;
}

export default function Evening() {
  const today = todayStr();
  const tasks = useLiveQuery(() => db.tasks.where("date").equals(today).toArray(), [today]);
  const week = useLiveQuery(() => weekPoints(today), [today]);

  const summary = tasks && week ? daySummary(tasks, week) : "…";
  const undone = (tasks ?? []).filter((t) => t.status !== "done");

  async function carryToTomorrow(t: Task) {
    const tomorrow = shiftDate(today, 1);
    await db.tasks.update(t.id, {
      date: tomorrow,
      carryCount: t.carryCount + 1,
      status: "pending",
      completedAt: null,
    });
  }
  async function deleteTask(t: Task) {
    await db.tasks.delete(t.id);
  }

  return (
    <div>
      <h1>Итог дня</h1>

      <div className="card">
        <div style={{ lineHeight: 1.6 }}>{summary}</div>
      </div>

      {undone.length > 0 ? (
        <>
          <h2>Невыполненное — что с ним?</h2>
          {undone.map((t) => (
            <div className="card" key={t.id}>
              <div>{t.title}</div>
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                <button className="primary small" onClick={() => carryToTomorrow(t)}>
                  Перенести на завтра
                </button>
                <button className="ghost small" onClick={() => deleteTask(t)}>
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </>
      ) : (
        <p className="muted">Невыполненных задач нет. Хорошего вечера 🌙</p>
      )}
    </div>
  );
}
