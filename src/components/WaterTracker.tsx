import { useLiveQuery } from "dexie-react-hooks";
import { bumpWin, db, todayStr, WATER_GOAL } from "../db";

// Компактный трекер воды на сегодня — маленькая приятная победа каждый день.
export function WaterTracker() {
  const today = todayStr();
  const win = useLiveQuery(() => db.wins.get(today), [today]);
  const water = win?.water ?? 0;
  const reached = water >= WATER_GOAL;

  return (
    <div className="card">
      <div className="row spread">
        <div>
          <div style={{ fontWeight: 600 }}>💧 Вода сегодня</div>
          <div className="muted">
            {water} из {WATER_GOAL} {reached ? "· цель взята, красава! 🎉" : "стаканов"}
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className="ghost small" onClick={() => bumpWin("water", -1)} aria-label="Убрать стакан" disabled={water === 0}>−</button>
          <button className="primary small" onClick={() => bumpWin("water", 1)}>+ стакан</button>
        </div>
      </div>
      <div style={{ height: 8, background: "var(--surface-2)", borderRadius: 5, overflow: "hidden", marginTop: 10 }}>
        <div
          style={{
            width: `${Math.min(100, (water / WATER_GOAL) * 100)}%`,
            height: "100%",
            background: reached ? "var(--green)" : "var(--grad)",
            transition: "width 0.2s",
          }}
        />
      </div>
    </div>
  );
}
