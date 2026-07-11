import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { db, DEFAULT_PROFILE, todayStr, type Task } from "../db";
import { TaskCard } from "../components/TaskCard";
import { CarryOverBanner } from "../components/CarryOverBanner";
import { BreakCard } from "../components/BreakCard";
import { Calendar, type DayCount } from "../components/Calendar";
import { DayReview } from "../components/DayReview";
import { DayIdeas } from "../components/DayIdeas";
import { WaterTracker } from "../components/WaterTracker";
import { HabitsCard } from "../components/HabitsCard";
import { MoodCard } from "../components/MoodCard";
import { QuitSmokingCard } from "../components/QuitSmokingCard";
import { scheduleBreakNotifications, clearBreakNotifications } from "../logic/notify";

function diffMin(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

export default function Today() {
  const today = todayStr();
  const [selected, setSelected] = useState(today);
  const now = new Date();
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() });

  // Только чтение (запись в live-запросе запрещена); подмешиваем дефолты для старых записей.
  const rawProfile = useLiveQuery(() => db.profile.get("me"), []);
  const profile = { ...DEFAULT_PROFILE, ...(rawProfile ?? {}) };

  // Задачи видимого месяца — для бейджей календаря.
  const monthStart = `${ym.year}-${String(ym.month + 1).padStart(2, "0")}-01`;
  const monthEnd = `${ym.year}-${String(ym.month + 1).padStart(2, "0")}-31`;
  const monthTasks = useLiveQuery(
    () => db.tasks.where("date").between(monthStart, monthEnd, true, true).toArray(),
    [monthStart, monthEnd],
  );

  const counts = useMemo(() => {
    const m = new Map<string, DayCount>();
    for (const t of monthTasks ?? []) {
      const c = m.get(t.date) ?? { total: 0, done: 0, overdue: false };
      c.total += 1;
      if (t.status === "done") c.done += 1;
      if (t.date < today && t.status === "pending") c.overdue = true;
      m.set(t.date, c);
    }
    return m;
  }, [monthTasks, today]);

  // Выбранный день.
  const tasks = useLiveQuery(() => db.tasks.where("date").equals(selected).toArray(), [selected]);
  const plan = useLiveQuery(() => db.plans.get(selected), [selected]);
  const carry = useLiveQuery(
    () => db.tasks.where("status").equals("pending").and((t) => t.date < today).toArray(),
    [today],
  );

  // Уведомления о перерывах — только для сегодняшнего дня и если разрешены.
  useEffect(() => {
    if (profile.notifications && selected === today && plan && plan.blocks.length > 0) {
      scheduleBreakNotifications(plan, profile.wantMovement);
    }
    return () => clearBreakNotifications();
  }, [profile.notifications, profile.wantMovement, selected, today, plan]);

  async function toggle(t: Task) {
    const done = t.status === "done";
    await db.tasks.update(t.id, {
      status: done ? "pending" : "done",
      completedAt: done ? null : new Date().toISOString(),
    });
  }
  async function addCarryToToday(t: Task) {
    await db.tasks.update(t.id, { date: today });
    setSelected(today);
  }
  async function deleteTask(t: Task) {
    await db.tasks.delete(t.id);
  }

  const taskById = new Map((tasks ?? []).map((t) => [t.id, t]));
  const plannedIds = new Set((plan?.blocks ?? []).filter((b) => b.taskId).map((b) => b.taskId!));
  const looseTasks = (tasks ?? []).filter((t) => !plannedIds.has(t.id));
  const hasPlan = plan && plan.blocks.length > 0;
  const nothing = (!tasks || tasks.length === 0) && !hasPlan;

  const selLabel =
    selected === today
      ? "Сегодня"
      : new Date(selected + "T00:00:00").toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });

  const greetHour = new Date().getHours();
  const greeting =
    greetHour < 5 ? "Доброй ночи" : greetHour < 12 ? "Доброе утро" : greetHour < 18 ? "Добрый день" : "Добрый вечер";
  const pendingToday = (tasks ?? []).filter((t) => t.status === "pending").length;
  const subtitle =
    selected === today
      ? pendingToday > 0
        ? `На сегодня осталось задач: ${pendingToday}. Чем займёмся?`
        : "На сегодня всё под контролем."
      : "";

  return (
    <div>
      <h1 style={{ marginBottom: 2 }}><span className="grad-text">{greeting}</span> 👋</h1>
      {subtitle && <div className="muted" style={{ marginBottom: 16 }}>{subtitle}</div>}

      <CarryOverBanner tasks={carry ?? []} onAddToToday={addCarryToToday} onDelete={deleteTask} />

      <Calendar
        year={ym.year}
        month={ym.month}
        selected={selected}
        counts={counts}
        onSelect={setSelected}
        onPrev={() => setYm((s) => (s.month === 0 ? { year: s.year - 1, month: 11 } : { ...s, month: s.month - 1 }))}
        onNext={() => setYm((s) => (s.month === 11 ? { year: s.year + 1, month: 0 } : { ...s, month: s.month + 1 }))}
      />

      <h2 style={{ textTransform: "capitalize" }}>{selLabel}</h2>

      {selected === today && (
        <>
          <WaterTracker />
          {profile.quitSmoking && <QuitSmokingCard profile={profile} />}
          <HabitsCard />
        </>
      )}

      {nothing && (
        <div className="empty">
          <p>На этот день пусто.</p>
          {selected >= today && (
            <Link to="/add">
              <button className="primary">Добавить задачи</button>
            </Link>
          )}
        </div>
      )}

      {hasPlan &&
        plan!.blocks.map((b, i) => {
          if (b.kind === "task") {
            const t = b.taskId ? taskById.get(b.taskId) : undefined;
            if (!t) return null;
            return (
              <div className="timeline-block" key={i}>
                <div className="timeline-time">{b.start}</div>
                <div className="timeline-body">
                  <TaskCard task={t} onToggle={toggle} />
                </div>
              </div>
            );
          }
          if (b.kind === "break") {
            return (
              <div className="timeline-block" key={i}>
                <div className="timeline-time">{b.start}</div>
                <div className="timeline-body">
                  <div className="card block-break muted">
                    {b.label.startsWith("Разминка") ? "🏃" : "☕"} {b.label} · {b.start}–{b.end}
                  </div>
                </div>
              </div>
            );
          }
          // free → перерыв «пачкой»
          return (
            <div className="timeline-block" key={i}>
              <div className="timeline-time">{b.start}</div>
              <div className="timeline-body">
                <BreakCard windowMinutes={diffMin(b.start, b.end)} wantMovement={profile.wantMovement} />
              </div>
            </div>
          );
        })}

      {looseTasks.length > 0 && (
        <>
          <h2>{hasPlan ? "Вне расписания" : "Задачи"}</h2>
          {looseTasks.map((t) => (
            <TaskCard key={t.id} task={t} onToggle={toggle} onDelete={deleteTask} />
          ))}
        </>
      )}

      {selected === today && <DayIdeas tasks={tasks ?? []} profile={profile} />}

      {selected === today && <MoodCard />}

      {(tasks?.length ?? 0) > 0 && selected <= today && <DayReview date={selected} />}
    </div>
  );
}
