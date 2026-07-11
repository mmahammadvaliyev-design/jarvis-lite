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
import {
  currencySymbol,
  db,
  DEFAULT_PROFILE,
  money,
  streakFromDates,
  todayStr,
  type Category,
} from "../db";
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

const MONTHS = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
];
const MOOD_FACES = ["", "😞", "😐", "🙂", "😀", "🤩"];

const CAT_COLORS: Record<Category, string> = {
  работа: "#2563eb",
  учёба: "#4f46e5",
  здоровье: "#059669",
  быт: "#d97706",
  финансы: "#db2777",
  люди: "#ea580c",
  саморазвитие: "#7c3aed",
  отдых: "#64748b",
};

const AXIS = "#6c788c";
const GRID = "#e3e8ef";
const TOOLTIP = { background: "#fff", border: "1px solid #e3e8ef", borderRadius: 8, color: "#15202e" } as const;

export default function Stats() {
  const today = todayStr();
  const start = shift(today, -6);
  const now = new Date();
  const mStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const mEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-31`;

  const tasks = useLiveQuery(() => db.tasks.where("date").between(start, today, true, true).toArray(), [today]);
  const monthTxns = useLiveQuery(() => db.txns.where("date").between(mStart, mEnd, true, true).toArray(), [mStart, mEnd]);
  const weekWins = useLiveQuery(() => db.wins.where("date").between(start, today, true, true).toArray(), [today]);
  const profile = useLiveQuery(() => db.profile.get("me"), []);
  const habits = useLiveQuery(() => db.habits.toArray(), []);
  const habitDones = useLiveQuery(() => db.habitDone.toArray(), []);

  if (!tasks) return <div className="screen">…</div>;

  // ── Задачи ──
  const winByDate = new Map((weekWins ?? []).map((w) => [w.date, w]));
  const byDay: { date: string; day: string; done: number; planned: number; focus: number; mood: number | null }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = shift(today, -i);
    const dayTasks = tasks.filter((t) => t.date === date);
    byDay.push({
      date,
      day: label(date),
      done: dayTasks.filter((t) => t.status === "done").length,
      planned: dayTasks.length,
      focus: dayTasks.filter((t) => t.status === "done").reduce((s, t) => s + t.estimateMin, 0),
      mood: winByDate.get(date)?.mood ?? null,
    });
  }
  const totalPlanned = tasks.length;
  const totalDone = tasks.filter((t) => t.status === "done").length;
  const pct = totalPlanned > 0 ? Math.round((totalDone / totalPlanned) * 100) : 0;
  const streak = currentStreak(byDay);

  const catMap = new Map<Category, number>();
  for (const t of tasks) if (t.status === "done") catMap.set(t.category, (catMap.get(t.category) ?? 0) + 1);
  const catData = [...catMap.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);

  // ── Бюджет ──
  const sym = currencySymbol(profile?.currency ?? DEFAULT_PROFILE.currency);
  const income = (monthTxns ?? []).filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = (monthTxns ?? []).filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const saved = income - expense;
  const hasBudget = (monthTxns ?? []).length > 0;

  // ── Активность ──
  const exercises = (weekWins ?? []).reduce((s, w) => s + w.exercises, 0);
  const water = (weekWins ?? []).reduce((s, w) => s + w.water, 0);

  // ── Настроение ──
  const moodDays = (weekWins ?? []).filter((w) => w.mood);
  const avgMood = moodDays.length ? Math.round(moodDays.reduce((s, w) => s + (w.mood ?? 0), 0) / moodDays.length) : 0;

  // ── Привычки: лучший стрик ──
  const doneByHabit = new Map<string, Set<string>>();
  for (const d of habitDones ?? []) {
    if (!doneByHabit.has(d.habitId)) doneByHabit.set(d.habitId, new Set());
    doneByHabit.get(d.habitId)!.add(d.date);
  }
  const streaks = (habits ?? []).map((h) => ({ title: h.title, s: streakFromDates(doneByHabit.get(h.id) ?? new Set(), today) })).sort((a, b) => b.s - a.s);
  const bestStreak = streaks[0]?.s ?? 0;

  const empty = totalPlanned === 0 && !hasBudget && exercises === 0 && water === 0 && bestStreak === 0 && moodDays.length === 0;

  const heroBits: string[] = [];
  if (totalDone > 0) heroBits.push(`закрыто задач: ${totalDone}`);
  if (bestStreak > 0) heroBits.push(`серия «${streaks[0].title}»: ${bestStreak} дн.`);
  if (exercises > 0) heroBits.push(`мини-тренировок: ${exercises}`);
  if (water > 0) heroBits.push(`стаканов воды: ${water}`);

  return (
    <div>
      <h1>Прогресс</h1>

      {empty ? (
        <div className="empty">
          <p>Пока нет данных. Добавь задачи и записи в бюджет — здесь появится твой прогресс.</p>
          <p className="muted">Хочешь просто посмотреть, как всё выглядит? Включи демо-режим в «Настройках» — твои данные при этом сохранятся.</p>
        </div>
      ) : (
        <>
          {heroBits.length > 0 && (
            <div className="card idea">
              <div style={{ fontWeight: 700, marginBottom: 4 }}>🚀 Ты хорошо поработал за неделю</div>
              <div style={{ lineHeight: 1.5 }}>
                {heroBits.join(", ").replace(/^./, (c) => c.toUpperCase())}. Так держать — капец продуктивно!
              </div>
            </div>
          )}

          {streaks.some((s) => s.s > 0) && (
            <>
              <h2>Серии привычек</h2>
              <div className="card">
                {streaks.filter((s) => s.s > 0).map((s) => (
                  <div key={s.title} className="row spread" style={{ padding: "8px 0", borderTop: "1px solid var(--border)" }}>
                    <span>🔥 {s.title}</span>
                    <span style={{ fontWeight: 700 }}>{s.s} дн. подряд</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {hasBudget && (
            <>
              <h2>Бюджет · {MONTHS[now.getMonth()]}</h2>
              <div className="card">
                <div className="row" style={{ gap: 14 }}>
                  <div className="grow center">
                    <div className="muted">Заработал</div>
                    <div style={{ fontWeight: 800, fontSize: 19, color: "var(--green)" }}>{money(income, sym)}</div>
                  </div>
                  <div className="grow center">
                    <div className="muted">Потратил</div>
                    <div style={{ fontWeight: 800, fontSize: 19, color: "var(--red)" }}>{money(expense, sym)}</div>
                  </div>
                </div>
                <div className="center" style={{ marginTop: 14, padding: 14, borderRadius: 12, background: saved >= 0 ? "var(--green-soft)" : "var(--red-soft)" }}>
                  <div className="muted">{saved >= 0 ? "Сэкономил в этом месяце" : "Перерасход в этом месяце"}</div>
                  <div className={`balance ${saved >= 0 ? "pos" : "neg"}`}>{money(Math.abs(saved), sym)}</div>
                  {saved > 0 && <div style={{ fontWeight: 600, color: "var(--green)" }}>Ты в плюсе — красава! 🎉</div>}
                </div>
              </div>
            </>
          )}

          {moodDays.length > 0 && (
            <>
              <h2>Настроение за неделю · в среднем {MOOD_FACES[avgMood]}</h2>
              <div className="card">
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={byDay} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="day" stroke={AXIS} fontSize={12} />
                    <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} stroke={AXIS} fontSize={12} tickFormatter={(v: number) => MOOD_FACES[v] ?? ""} />
                    <Tooltip contentStyle={TOOLTIP} formatter={(v: number) => [MOOD_FACES[v] ?? v, "настроение"]} />
                    <Line type="monotone" dataKey="mood" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {(exercises > 0 || water > 0 || totalDone > 0) && (
            <>
              <h2>Активность за неделю</h2>
              <div className="card">
                <div className="row" style={{ gap: 10 }}>
                  <StatTile value={String(totalDone)} label="задач закрыто" />
                  <StatTile value={String(exercises)} label="мини-тренировок" />
                  <StatTile value={String(water)} label="стаканов воды" />
                </div>
                <p className="muted center" style={{ marginTop: 10, marginBottom: 0 }}>
                  {exercises + water > 0 ? "Тело и голова в тонусе — так и надо! 💪" : "Начни с малого — пара стаканов воды уже плюс."}
                </p>
              </div>
            </>
          )}

          {totalPlanned > 0 && (
            <>
              <div className="row" style={{ gap: 10 }}>
                <StatTile value={`${pct}%`} label="выполнено за неделю" />
                <StatTile value={String(streak)} label={`${streak === 1 ? "день" : "дней"} серии`} />
              </div>

              <h2>Выполнено по дням</h2>
              <div className="card">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={byDay} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="day" stroke={AXIS} fontSize={12} />
                    <YAxis stroke={AXIS} fontSize={12} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP} formatter={(v: number, n: string) => [v, n === "done" ? "выполнено" : "запланировано"]} />
                    <Bar dataKey="planned" fill="#e2e0ef" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="done" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {catData.length > 0 && (
                <>
                  <h2>По категориям (неделя)</h2>
                  <div className="card">
                    <ResponsiveContainer width="100%" height={Math.max(120, catData.length * 34)}>
                      <BarChart data={catData} layout="vertical" margin={{ top: 4, right: 12, left: 40, bottom: 4 }}>
                        <XAxis type="number" stroke={AXIS} fontSize={12} allowDecimals={false} />
                        <YAxis type="category" dataKey="category" stroke={AXIS} fontSize={12} width={90} />
                        <Tooltip contentStyle={TOOLTIP} formatter={(v: number) => [v, "выполнено"]} />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                          {catData.map((d) => (
                            <Cell key={d.category} fill={CAT_COLORS[d.category]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </>
          )}

          <p className="muted center" style={{ marginTop: 16 }}>
            Только реальные счётчики — честный прогресс без выдуманных процентов.
          </p>
        </>
      )}
    </div>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="card grow center" style={{ margin: 0 }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent)" }}>{value}</div>
      <div className="muted">{label}</div>
    </div>
  );
}
