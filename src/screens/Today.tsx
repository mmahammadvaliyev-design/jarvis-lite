import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { db, DEFAULT_PROFILE, todayStr, type Task } from "../db";
import { TaskCard } from "../components/TaskCard";
import { CarryOverBanner } from "../components/CarryOverBanner";
import { FreeBlock } from "../components/FreeBlock";

function diffMin(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

export default function Today() {
  const today = todayStr();
  // Только чтение — запись в БД внутри useLiveQuery запрещена Dexie.
  const profile = useLiveQuery(() => db.profile.get("me"), []);
  const tasks = useLiveQuery(() => db.tasks.where("date").equals(today).toArray(), [today]);
  const plan = useLiveQuery(() => db.plans.get(today), [today]);
  const carry = useLiveQuery(
    () =>
      db.tasks
        .where("status")
        .equals("pending")
        .and((t) => t.date < today)
        .toArray(),
    [today],
  );

  async function toggle(t: Task) {
    const done = t.status === "done";
    await db.tasks.update(t.id, {
      status: done ? "pending" : "done",
      completedAt: done ? null : new Date().toISOString(),
    });
  }

  async function addCarryToToday(t: Task) {
    await db.tasks.update(t.id, { date: today });
  }
  async function deleteTask(t: Task) {
    await db.tasks.delete(t.id);
  }

  const interests = profile?.interests ?? DEFAULT_PROFILE.interests;
  const taskById = new Map((tasks ?? []).map((t) => [t.id, t]));
  const plannedIds = new Set((plan?.blocks ?? []).filter((b) => b.taskId).map((b) => b.taskId!));
  const looseTasks = (tasks ?? []).filter((t) => !plannedIds.has(t.id));

  const nothing = (!tasks || tasks.length === 0) && (!plan || plan.blocks.length === 0);

  return (
    <div>
      <h1>Сегодня</h1>

      <CarryOverBanner tasks={carry ?? []} onAddToToday={addCarryToToday} onDelete={deleteTask} />

      {nothing && (
        <div className="empty">
          <p>На сегодня пока пусто.</p>
          <Link to="/add">
            <button className="primary">Добавить задачи</button>
          </Link>
        </div>
      )}

      {plan && plan.blocks.length > 0 && (
        <>
          <h2>Расписание</h2>
          {plan.blocks.map((b, i) => {
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
                    <div className="card block-break muted">☕ {b.label} · {b.start}–{b.end}</div>
                  </div>
                </div>
              );
            }
            // free
            return (
              <div className="timeline-block" key={i}>
                <div className="timeline-time">{b.start}</div>
                <div className="timeline-body">
                  <FreeBlock interests={interests} windowMinutes={diffMin(b.start, b.end)} />
                </div>
              </div>
            );
          })}
          {plan.overflowTaskIds.length > 0 && (
            <p className="muted">В расписание влезло не всё — лишнее ниже, перенесите вечером на завтра.</p>
          )}
        </>
      )}

      {looseTasks.length > 0 && (
        <>
          <h2>{plan && plan.blocks.length > 0 ? "Вне расписания" : "Задачи"}</h2>
          {looseTasks.map((t) => (
            <TaskCard key={t.id} task={t} onToggle={toggle} onDelete={deleteTask} />
          ))}
        </>
      )}
    </div>
  );
}
