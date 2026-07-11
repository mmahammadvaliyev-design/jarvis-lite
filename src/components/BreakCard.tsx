import { useEffect, useState } from "react";
import { db, todayStr } from "../db";
import { buildBreakBundle, type BreakBundle } from "../content/suggestions";

// Один перерыв «пачкой»: пора передохнуть + факт + слово на английском + разминка.
export function BreakCard({
  windowMinutes,
  wantMovement,
}: {
  windowMinutes: number;
  wantMovement: boolean;
}) {
  const [bundle, setBundle] = useState<BreakBundle | null>(null);

  async function load() {
    const today = todayStr();
    const seenRows = await db.seen.where("date").equals(today).toArray();
    const seenIds = seenRows.map((r) => r.suggestionId);
    const b = buildBreakBundle(seenIds, wantMovement);
    // Помечаем показанное, чтобы «Другой перерыв» не повторял то же самое.
    for (const s of [b.fact, b.word]) {
      if (s) await db.seen.put({ id: `${s.id}@${today}`, suggestionId: s.id, date: today });
    }
    setBundle(b);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!bundle) {
    return (
      <div className="card block-free">
        <div className="muted">☕ Перерыв ~{windowMinutes} мин</div>
      </div>
    );
  }

  return (
    <div className="card block-free">
      <div style={{ fontWeight: 700, marginBottom: 8 }}>☕ Пора передохнуть · ~{windowMinutes} мин</div>

      {bundle.fact && (
        <div style={{ marginBottom: 10 }}>
          <div className="muted" style={{ marginBottom: 2 }}>💡 Интересный факт</div>
          <div style={{ fontWeight: 600 }}>{bundle.fact.title}</div>
          <div style={{ lineHeight: 1.5 }}>{bundle.fact.content}</div>
        </div>
      )}

      {bundle.word && (
        <div style={{ marginBottom: 10 }}>
          <div className="muted" style={{ marginBottom: 2 }}>📖 Слово на английском</div>
          <div style={{ fontWeight: 600 }}>{bundle.word.title}</div>
          <div style={{ lineHeight: 1.5 }}>{bundle.word.content}</div>
        </div>
      )}

      {bundle.movement && (
        <div style={{ marginBottom: 4 }}>
          <div className="muted" style={{ marginBottom: 2 }}>🏃 Разминка</div>
          <div style={{ fontWeight: 600 }}>{bundle.movement}</div>
        </div>
      )}

      <div className="row" style={{ gap: 8, marginTop: 10 }}>
        <button className="small" onClick={load}>
          Другой перерыв
        </button>
      </div>
    </div>
  );
}
