import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  nextMilestone,
  streakFromDates,
  toggleHabitToday,
  todayStr,
  uid,
  type Habit,
} from "../db";

export function HabitsCard() {
  const today = todayStr();
  const habits = useLiveQuery(() => db.habits.orderBy("createdAt").toArray(), []);
  const dones = useLiveQuery(() => db.habitDone.toArray(), []);
  const [title, setTitle] = useState("");

  const doneByHabit = new Map<string, Set<string>>();
  for (const d of dones ?? []) {
    if (!doneByHabit.has(d.habitId)) doneByHabit.set(d.habitId, new Set());
    doneByHabit.get(d.habitId)!.add(d.date);
  }

  async function add() {
    const t = title.trim();
    if (!t) return;
    const h: Habit = { id: uid(), title: t, createdAt: today };
    await db.habits.put(h);
    setTitle("");
  }
  async function removeHabit(id: string) {
    await db.habits.delete(id);
    const rows = await db.habitDone.where("habitId").equals(id).toArray();
    await db.habitDone.bulkDelete(rows.map((r) => r.id));
  }

  const list = habits ?? [];

  return (
    <div className="card">
      <div className="row spread" style={{ marginBottom: list.length ? 10 : 4 }}>
        <div style={{ fontWeight: 700 }}>🔥 Привычки и серии</div>
      </div>

      {list.length === 0 && (
        <div className="muted" style={{ marginBottom: 10 }}>
          Добавь привычку, которую делаешь каждый день (английский, спорт, чтение) — и держи серию как в Duolingo.
        </div>
      )}

      {list.map((h) => {
        const set = doneByHabit.get(h.id) ?? new Set<string>();
        const streak = streakFromDates(set, today);
        const doneToday = set.has(today);
        const goal = nextMilestone(streak);
        const left = goal - streak;
        return (
          <div key={h.id} className="row spread" style={{ padding: "10px 0", borderTop: "1px solid var(--border)", gap: 10 }}>
            <div className="grow">
              <div style={{ fontWeight: 600 }}>
                {streak > 0 ? `🔥 ${streak} ${plural(streak, "день", "дня", "дней")} подряд` : "Серия ещё не начата"} · {h.title}
              </div>
              <div className="muted" style={{ marginTop: 2 }}>
                {streak === 0
                  ? "Отметь сегодня — и серия пойдёт 💪"
                  : goal === 100 && left <= 30
                    ? `До юбилейного 100-го дня осталось ${left} — терять темп нельзя!`
                    : `До ${goal} осталось ${left} ${plural(left, "день", "дня", "дней")} — так держать!`}
              </div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <button
                className={doneToday ? "small" : "primary small"}
                onClick={() => toggleHabitToday(h.id)}
                style={doneToday ? { background: "var(--green-soft)", color: "var(--green)" } : undefined}
              >
                {doneToday ? "✓ Сегодня" : "Отметить"}
              </button>
              <button className="ghost small" onClick={() => removeHabit(h.id)} aria-label="Удалить привычку">✕</button>
            </div>
          </div>
        );
      })}

      <div className="row" style={{ gap: 8, marginTop: 12 }}>
        <input
          type="text"
          placeholder="новая привычка…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button className="small" onClick={add}>Добавить</button>
      </div>
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
