import { todayStr } from "../db";

export interface DayCount {
  total: number;
  done: number;
  overdue: boolean; // есть непросроченные-невыполненные из прошлого (для этой даты в прошлом)
}

const WEEKDAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
const MONTHS = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
];

function dateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function Calendar({
  year,
  month, // 0-11
  selected,
  counts,
  onSelect,
  onPrev,
  onNext,
}: {
  year: number;
  month: number;
  selected: string;
  counts: Map<string, DayCount>;
  onSelect: (date: string) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const today = todayStr();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // getDay(): 0=вс..6=сб → приводим к пн=0..вс=6
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="card">
      <div className="row spread" style={{ marginBottom: 10 }}>
        <button className="ghost small" onClick={onPrev} aria-label="Предыдущий месяц">←</button>
        <div style={{ fontWeight: 600 }}>{MONTHS[month]} {year}</div>
        <button className="ghost small" onClick={onNext} aria-label="Следующий месяц">→</button>
      </div>

      <div className="cal-grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="cal-dow">{w}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const key = dateKey(year, month, d);
          const c = counts.get(key);
          const isToday = key === today;
          const isSel = key === selected;
          const cls = ["cal-day"];
          if (isToday) cls.push("cal-today");
          if (isSel) cls.push("cal-sel");
          return (
            <button key={key} className={cls.join(" ")} onClick={() => onSelect(key)}>
              <span className="cal-num">{d}</span>
              {c && c.total > 0 && (
                <span className={`cal-badge ${c.overdue ? "over" : c.done >= c.total ? "alldone" : ""}`}>
                  {c.done}/{c.total}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
