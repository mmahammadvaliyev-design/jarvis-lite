import type { Task } from "../db";

const PRIORITY_LABEL = { high: "важно", medium: "средне", low: "если успею" } as const;

export function TaskCard({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle?: (t: Task) => void;
  onDelete?: (t: Task) => void;
}) {
  const done = task.status === "done";
  return (
    <div className={`card ${done ? "task-done" : ""}`}>
      <div className="row spread">
        <div className="row grow" style={{ gap: 10 }}>
          {onToggle && (
            <button
              className={`checkbox ${done ? "on" : ""}`}
              aria-label={done ? "Снять отметку" : "Выполнено"}
              onClick={() => onToggle(task)}
            >
              {done ? "✓" : ""}
            </button>
          )}
          <div className="grow">
            <div className="task-title">{task.title}</div>
            <div className="row wrap" style={{ gap: 6, marginTop: 6 }}>
              <span className="pill">{task.category}</span>
              <span className={`pill ${task.priority}`}>{PRIORITY_LABEL[task.priority]}</span>
              <span className="pill">{task.estimateMin} мин</span>
              {task.preferredTime && <span className="pill">🕒 {task.preferredTime}</span>}
              {task.carryCount > 0 && <span className="pill medium">↻ перенос ×{task.carryCount}</span>}
            </div>
          </div>
        </div>
        {onDelete && (
          <button className="ghost small" onClick={() => onDelete(task)} aria-label="Удалить">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
