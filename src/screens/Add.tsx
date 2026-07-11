import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CATEGORIES, db, getProfile, nowHHMM, todayStr, type Category, type Priority } from "../db";
import { draftToTask, parseTasks, type TaskDraft } from "../logic/parseTasks";
import { buildDay } from "../logic/buildDay";

const PLACEHOLDER = `Одна задача — одна строка. Например:
доделать отчёт по работе, это важно
сходить в зал в 18:00
позвонить маме если успею
почитать книгу 30 мин`;

export default function Add() {
  const nav = useNavigate();
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<TaskDraft[] | null>(null);
  const [busy, setBusy] = useState(false);

  function handleParse() {
    const parsed = parseTasks(text);
    setDrafts(parsed);
  }

  function updateDraft(i: number, patch: Partial<TaskDraft>) {
    setDrafts((d) => (d ? d.map((x, idx) => (idx === i ? { ...x, ...patch } : x)) : d));
  }
  function removeDraft(i: number) {
    setDrafts((d) => (d ? d.filter((_, idx) => idx !== i) : d));
  }

  async function buildAndGo() {
    if (!drafts || drafts.length === 0) return;
    setBusy(true);
    try {
      const today = todayStr();
      const tasks = drafts.map((d) => draftToTask(d, today));
      await db.tasks.bulkPut(tasks);

      // Собираем все pending-задачи на сегодня (включая перенесённые ранее).
      const carried = await db.tasks
        .where("status")
        .equals("pending")
        .and((t) => t.date < today)
        .toArray();
      // Переносим «хвосты» на сегодня, чтобы попали в план.
      for (const t of carried) {
        await db.tasks.update(t.id, { date: today });
      }
      const allToday = await db.tasks.where("date").equals(today).toArray();

      const profile = await getProfile();
      const plan = buildDay(allToday, {
        wakeTime: profile.wakeTime,
        sleepTime: profile.sleepTime,
        workStart: profile.workStart,
        workEnd: profile.workEnd,
        now: nowHHMM(),
        wantMovement: profile.wantMovement,
        breakEveryMin: profile.breakEveryMin,
      });
      await db.plans.put({ date: today, ...plan });
      nav("/");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1>Добавить задачи</h1>

      {!drafts && (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={PLACEHOLDER}
          />
          <div className="row" style={{ marginTop: 10 }}>
            <button className="primary" onClick={handleParse} disabled={!text.trim()}>
              Разобрать
            </button>
          </div>
          <p className="muted" style={{ marginTop: 12 }}>
            Категории и приоритеты угадываются по ключевым словам. После разбора всё можно поправить руками.
          </p>
        </>
      )}

      {drafts && (
        <>
          <p className="muted">Проверьте и поправьте, потом стройте день:</p>
          {drafts.length === 0 && <div className="empty">Ничего не распозналось. Вернитесь и введите задачи.</div>}
          {drafts.map((d, i) => (
            <div className="card" key={i}>
              <input
                type="text"
                value={d.title}
                onChange={(e) => updateDraft(i, { title: e.target.value })}
              />
              <div className="row wrap" style={{ gap: 8, marginTop: 10 }}>
                <select
                  value={d.category}
                  onChange={(e) => updateDraft(i, { category: e.target.value as Category })}
                  style={{ width: "auto", flex: "1 1 40%" }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  value={d.priority}
                  onChange={(e) => updateDraft(i, { priority: e.target.value as Priority })}
                  style={{ width: "auto", flex: "1 1 40%" }}
                >
                  <option value="high">важно</option>
                  <option value="medium">средне</option>
                  <option value="low">если успею</option>
                </select>
              </div>
              <div className="row wrap" style={{ gap: 8, marginTop: 8 }}>
                <label style={{ margin: 0 }} className="grow">
                  минут
                  <input
                    type="text"
                    inputMode="numeric"
                    value={String(d.estimateMin)}
                    onChange={(e) => updateDraft(i, { estimateMin: parseInt(e.target.value, 10) || 0 })}
                  />
                </label>
                <label style={{ margin: 0 }} className="grow">
                  время (если нужно)
                  <input
                    type="time"
                    value={d.preferredTime ?? ""}
                    onChange={(e) => updateDraft(i, { preferredTime: e.target.value || null })}
                  />
                </label>
                <button className="ghost small" onClick={() => removeDraft(i)} style={{ alignSelf: "flex-end" }}>
                  Убрать
                </button>
              </div>
            </div>
          ))}

          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <button className="ghost" onClick={() => setDrafts(null)}>
              Назад
            </button>
            <button className="primary grow" onClick={buildAndGo} disabled={busy || drafts.length === 0}>
              {busy ? "Строю…" : "Построить день"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
