import { useLiveQuery } from "dexie-react-hooks";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { db, todayStr, type Category } from "../db";
import { currentStreak } from "../logic/daySummary";

function shift(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return todayStr(d);
}
function label(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return ["вс", "пн", "вт", "ср", "чт", "пт", "сб"][d.getDay()];
}

const CAT_COLORS: Record<Category, string> = {
  работа: "#38bdf8",
  учёба: "#818cf8",
  здоровье: "#34d399",
  быт: "#fbbf24",
  финансы: "#f472b6",
  люди: "#fb923c",
  саморазвитие: "#a78bfa",
  отдых: "#94a3b8",
};

export default function Stats() {
  const today = todayStr();
  const start = shift(today, -6);
  const tasks = useLiveQuery(
    () => db.tasks.where("date").between(start, today, true, true).toArray(),
    [today],
  );

  if (!tasks) return <div className="screen">…</div>;

  // Данные по дням.
  const byDay: { date: string; day: string; done: number; planned: number; focus: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = shift(today, -i);
    const dayTasks = tasks.filter((t) => t.date === date);
    byDay.push({
      date,
      day: label(date),
      done: dayTasks.filter((t) => t.status === "done").length,
      planned: dayTasks.length,
      focus: dayTasks.filter((t) => t.status === "done").reduce((s, t) => s + t.estimateMin, 0),
    });
  }

  const totalPlanned = tasks.length;
  const totalDone = tasks.filter((t) => t.status === "done").length;
  const pct = totalPlanned > 0 ? Math.round((totalDone / totalPlanned) * 100) : 0;
  const streak = currentStreak(byDay);

  // Распределение выполненных по категориям.
  const catMap = new Map<Category, number>();
  for (const t of tasks) {
    if (t.status === "done") catMap.set(t.category, (catMap.get(t.category) ?? 0) + 1);
  }
  const catData = [...catMap.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const empty = totalPlanned === 0;

  return (
    <div>
      <h1>Статистика</h1>

      {empty ? (
        <div className="empty">
          <p>Пока нет данных за неделю.</p>
          <SeedButtons />
        </div>
      ) : (
        <>
          <div className="row" style={{ gap: 10 }}>
            <StatTile value={`${pct}%`} label="выполнено за неделю" />
            <StatTile value={String(streak)} label={`${streak === 1 ? "день" : "дней"} серии`} />
            <StatTile value={String(totalDone)} label="задач закрыто" />
          </div>

          <h2>Выполнено по дням</h2>
          <div className="card">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byDay} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }}
                  formatter={(v: number, n: string) => [v, n === "done" ? "выполнено" : "запланировано"]}
                />
                <Bar dataKey="planned" fill="#334155" radius={[4, 4, 0, 0]} />
                <Bar dataKey="done" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h2>По категориям (неделя)</h2>
          <div className="card">
            <ResponsiveContainer width="100%" height={Math.max(120, catData.length * 34)}>
              <BarChart data={catData} layout="vertical" margin={{ top: 4, right: 12, left: 40, bottom: 4 }}>
                <XAxis type="number" stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                <YAxis type="category" dataKey="category" stroke="#94a3b8" fontSize={12} width={90} />
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }}
                  formatter={(v: number) => [v, "выполнено"]}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {catData.map((d) => (
                    <Cell key={d.category} fill={CAT_COLORS[d.category]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h2>Время в фокусе (минуты выполненного)</h2>
          <div className="card">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={byDay} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }}
                  formatter={(v: number) => [`${v} мин`, "фокус"]}
                />
                <Line type="monotone" dataKey="focus" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="muted center" style={{ marginTop: 16 }}>
            Только реальные счётчики — без выдуманных процентов «роста продуктивности».
          </p>
          <div style={{ marginTop: 12 }}>
            <SeedButtons />
          </div>
        </>
      )}
    </div>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="card grow center" style={{ margin: 0 }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: "var(--accent)" }}>{value}</div>
      <div className="muted">{label}</div>
    </div>
  );
}

function SeedButtons() {
  return (
    <details style={{ marginTop: 8 }}>
      <summary className="muted" style={{ cursor: "pointer" }}>Для теста</summary>
      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        <button
          className="small"
          onClick={async () => {
            const { seedWeek } = await import("../seed");
            await seedWeek();
          }}
        >
          Заполнить тестовыми данными за неделю
        </button>
        <button
          className="ghost small"
          onClick={async () => {
            if (!confirm("Удалить ВСЕ задачи, планы и историю? Это необратимо.")) return;
            const { clearAll } = await import("../seed");
            await clearAll();
          }}
        >
          Очистить всё
        </button>
      </div>
    </details>
  );
}
