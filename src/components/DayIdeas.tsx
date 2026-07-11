import { useMemo, useState } from "react";
import { db, nowHHMM, todayStr, uid, type Profile, type Task } from "../db";
import { proposeIdeas, type Idea } from "../logic/propose";

// Проактивные подсказки «не хочешь уделить время…» для сегодняшнего дня.
export function DayIdeas({ tasks, profile }: { tasks: Task[]; profile: Profile }) {
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);

  const ideas = useMemo(() => proposeIdeas(tasks, profile, nowHHMM()), [tasks, profile]);

  if (dismissed || ideas.length === 0) return null;
  const visible = ideas.filter((i) => !added.has(i.title));
  if (visible.length === 0) return null;

  async function add(idea: Idea) {
    const task: Task = {
      id: uid(),
      title: idea.title,
      category: idea.category,
      priority: "low",
      estimateMin: idea.estimateMin,
      preferredTime: null,
      energy: "low",
      status: "pending",
      date: todayStr(),
      createdAt: new Date().toISOString(),
      completedAt: null,
      carryCount: 0,
    };
    await db.tasks.put(task);
    setAdded((s) => new Set(s).add(idea.title));
  }

  return (
    <div className="card idea" style={{ marginTop: 16 }}>
      <div className="row spread" style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 700 }}>💡 Идеи на сегодня</div>
        <button className="ghost small" onClick={() => setDismissed(true)} aria-label="Скрыть">✕</button>
      </div>
      {visible.map((idea) => (
        <div key={idea.title} className="row spread" style={{ padding: "9px 0", borderTop: "1px solid var(--border)", gap: 10 }}>
          <div className="grow">
            <div style={{ fontWeight: 600 }}>Не хочешь уделить время: {idea.title.toLowerCase()}?</div>
            <div className="muted">{idea.reason} · ~{idea.estimateMin} мин</div>
          </div>
          <button className="primary small" onClick={() => add(idea)}>+ В план</button>
        </div>
      ))}
    </div>
  );
}
