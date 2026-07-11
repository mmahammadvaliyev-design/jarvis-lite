import { useLiveQuery } from "dexie-react-hooks";
import { db, setMood, todayStr } from "../db";

const FACES = [
  { v: 1, e: "😞", label: "тяжело" },
  { v: 2, e: "😐", label: "так себе" },
  { v: 3, e: "🙂", label: "норм" },
  { v: 4, e: "😀", label: "хорошо" },
  { v: 5, e: "🤩", label: "супер" },
];

export function MoodCard() {
  const today = todayStr();
  const win = useLiveQuery(() => db.wins.get(today), [today]);
  const mood = win?.mood ?? 0;

  return (
    <div className="card">
      <div style={{ fontWeight: 700, marginBottom: 2 }}>Как ты сегодня?</div>
      <div className="muted" style={{ marginBottom: 10 }}>
        {mood ? `Отмечено: ${FACES.find((f) => f.v === mood)?.label}` : "Оцени день — увидишь связь настроения и продуктивности"}
      </div>
      <div className="row" style={{ gap: 6, justifyContent: "space-between" }}>
        {FACES.map((f) => (
          <button
            key={f.v}
            onClick={() => setMood(today, f.v)}
            aria-label={f.label}
            style={{
              flex: 1,
              fontSize: 26,
              padding: "8px 0",
              background: mood === f.v ? "var(--accent-soft)" : "var(--surface-2)",
              border: mood === f.v ? "2px solid var(--accent)" : "2px solid transparent",
              lineHeight: 1,
            }}
          >
            {f.e}
          </button>
        ))}
      </div>
    </div>
  );
}
