import { useEffect, useState } from "react";
import { bumpWin, db, todayStr } from "../db";
import { buildBreakBundle, pickPraise, type BreakBundle } from "../content/suggestions";

// Один перерыв «пачкой»: пора передохнуть + факт + слово на английском + лёгкая разминка.
export function BreakCard({
  windowMinutes,
  wantMovement,
}: {
  windowMinutes: number;
  wantMovement: boolean;
}) {
  const [bundle, setBundle] = useState<BreakBundle | null>(null);
  const [praise, setPraise] = useState<string | null>(null);

  async function load() {
    const today = todayStr();
    const seenRows = await db.seen.where("date").equals(today).toArray();
    const seenIds = seenRows.map((r) => r.suggestionId);
    const b = buildBreakBundle(seenIds, wantMovement);
    for (const s of [b.fact, b.word]) {
      if (s) await db.seen.put({ id: `${s.id}@${today}`, suggestionId: s.id, date: today });
    }
    setBundle(b);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // «Готово»: засчитываем мини-тренировку, хвалим и переходим к следующему.
  async function done() {
    if (bundle?.movement) await bumpWin("exercises");
    setPraise(pickPraise());
    setTimeout(() => {
      setPraise(null);
      load();
    }, 1300);
  }

  if (!bundle) {
    return (
      <div className="card block-free">
        <div className="muted">☕ Перерыв ~{windowMinutes} мин</div>
      </div>
    );
  }

  if (praise) {
    return (
      <div className="card block-free center" style={{ padding: "26px 15px" }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>{praise}</div>
        <div className="muted" style={{ marginTop: 4 }}>Готовим следующий перерыв…</div>
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
          <div className="muted" style={{ marginBottom: 2 }}>🏃 Лёгкая разминка</div>
          <div style={{ fontWeight: 600 }}>{bundle.movement}</div>
        </div>
      )}

      <div className="row" style={{ gap: 8, marginTop: 12 }}>
        <button className="primary small grow" onClick={done}>Готово ✓</button>
        <button className="ghost small" onClick={load}>Другое</button>
      </div>
    </div>
  );
}
