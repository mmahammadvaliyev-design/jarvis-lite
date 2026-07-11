import { useState } from "react";
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

// Итог дня + перенос невыполненного (бывший экран «Вечер»), встроенный в день.
export function DayReview({ date }: { date: string }) {
  const [open, setOpen] = useState(false);
  const tasks = useLiveQuery(() => db.tasks.where("date").equals(date).toArray(), [date]);
  const week = useLiveQuery(() => weekPoints(date), [date]);

  if (!tasks || tasks.length === 0) return null;

  const summary = week ? daySummary(tasks, week) : "…";
  const undone = tasks.filter((t) => t.status !== "done");

  async function carryToTomorrow(t: Task) {
    await db.tasks.update(t.id, {
      date: shiftDate(date, 1),
      carryCount: t.carryCount + 1,
      status: "pending",
      completedAt: null,
    });
  }
  async function del(t: Task) {
    await db.tasks.delete(t.id);
  }

  return (
    <div className="card banner" style={{ marginTop: 16 }}>
      <div className="row spread" style={{ cursor: "pointer" }} onClick={() => setOpen((o) => !o)}>
        <div style={{ fontWeight: 600 }}>🌙 Итог дня</div>
        <button className="ghost small">{open ? "свернуть" : "показать"}</button>
      </div>

      {open && (
        <div style={{ marginTop: 10 }}>
          <div style={{ lineHeight: 1.6 }}>{summary}</div>
          {undone.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="muted" style={{ marginBottom: 6 }}>Невыполненное:</div>
              {undone.map((t) => (
                <div key={t.id} className="row spread" style={{ padding: "8px 0", borderTop: "1px solid var(--border)" }}>
                  <div className="grow">{t.title}</div>
                  <div className="row" style={{ gap: 6 }}>
                    <button className="small primary" onClick={() => carryToTomorrow(t)}>→ завтра</button>
                    <button className="ghost small" onClick={() => del(t)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
