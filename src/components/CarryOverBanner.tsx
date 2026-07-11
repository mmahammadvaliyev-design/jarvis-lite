import { useState } from "react";
import type { Task } from "../db";

export function CarryOverBanner({
  tasks,
  onAddToToday,
  onDelete,
}: {
  tasks: Task[];
  onAddToToday: (t: Task) => void;
  onDelete: (t: Task) => void;
}) {
  const [open, setOpen] = useState(false);
  if (tasks.length === 0) return null;

  return (
    <div className="card banner">
      <div className="row spread" onClick={() => setOpen((o) => !o)} style={{ cursor: "pointer" }}>
        <div>
          ⏳ {tasks.length} {plural(tasks.length, "задача", "задачи", "задач")} {plural(tasks.length, "ждёт", "ждут", "ждут")} со вчера
        </div>
        <button className="ghost small">{open ? "свернуть" : "показать"}</button>
      </div>

      {open && (
        <div style={{ marginTop: 10 }}>
          {tasks.map((t) => (
            <div key={t.id} className="row spread" style={{ padding: "8px 0", borderTop: "1px solid var(--border)" }}>
              <div className="grow">
                <div>{t.title}</div>
                <div className="muted">перенос ×{t.carryCount}</div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button className="small primary" onClick={() => onAddToToday(t)}>
                  В сегодня
                </button>
                <button className="ghost small" onClick={() => onDelete(t)}>
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}
