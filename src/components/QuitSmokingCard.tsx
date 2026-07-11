import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { bumpWin, db, todayStr, type Profile } from "../db";

const ALTERNATIVES = [
  "Сделай 5 глубоких медленных вдохов",
  "Выпей стакан воды",
  "Пройдись 3 минуты",
  "Сделай 10 приседаний",
  "Умойся прохладной водой",
  "Съешь что-нибудь полезное (орехи, фрукт)",
  "Напиши близкому человеку",
  "Разомни шею и плечи",
];

function daysBetween(from: string, to: string): number {
  const a = new Date(from + "T00:00:00").getTime();
  const b = new Date(to + "T00:00:00").getTime();
  return Math.max(0, Math.round((b - a) / 86400000)) + 1;
}

export function QuitSmokingCard({ profile }: { profile: Profile }) {
  const today = todayStr();
  const win = useLiveQuery(() => db.wins.get(today), [today]);
  const [tip, setTip] = useState<string | null>(null);

  const days = profile.quitDate ? daysBetween(profile.quitDate, today) : 0;
  const resisted = win?.urges ?? 0;

  async function urge() {
    setTip(ALTERNATIVES[Math.floor(Math.random() * ALTERNATIVES.length)]);
    await bumpWin("urges");
  }

  return (
    <div className="card idea">
      <div style={{ fontWeight: 700, marginBottom: 2 }}>🚭 Без сигарет</div>
      <div className="muted" style={{ marginBottom: 10 }}>
        {days > 0 ? `Ты держишься уже ${days} ${plural(days, "день", "дня", "дней")} — гордись собой.` : "Первый день — самый важный. Ты сможешь."}
        {resisted > 0 && ` Сегодня устоял ${resisted} ${plural(resisted, "раз", "раза", "раз")}.`}
      </div>

      {tip && (
        <div className="card" style={{ margin: "0 0 10px", background: "var(--surface)" }}>
          <div className="muted" style={{ marginBottom: 2 }}>Вместо сигареты:</div>
          <div style={{ fontWeight: 600 }}>{tip}</div>
        </div>
      )}

      <button className="primary" style={{ width: "100%" }} onClick={urge}>
        Тянет закурить — отвлеки меня
      </button>
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
