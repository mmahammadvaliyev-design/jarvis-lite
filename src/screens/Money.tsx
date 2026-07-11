import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  money,
  todayStr,
  uid,
  type Txn,
  type TxnType,
} from "../db";

const MONTHS = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
];

export default function Money() {
  const now = new Date();
  const [ym] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const monthStart = `${ym.year}-${String(ym.month + 1).padStart(2, "0")}-01`;
  const monthEnd = `${ym.year}-${String(ym.month + 1).padStart(2, "0")}-31`;

  const txns = useLiveQuery(
    () => db.txns.where("date").between(monthStart, monthEnd, true, true).reverse().sortBy("date"),
    [monthStart, monthEnd],
  );

  // Форма
  const [type, setType] = useState<TxnType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayStr());

  const cats = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  function setKind(k: TxnType) {
    setType(k);
    setCategory((k === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES)[0]);
  }

  async function add() {
    const amt = Math.round(parseFloat(amount.replace(",", ".")));
    if (!amt || amt <= 0) return;
    const t: Txn = {
      id: uid(),
      type,
      amount: amt,
      category,
      note: note.trim(),
      date,
      createdAt: new Date().toISOString(),
    };
    await db.txns.put(t);
    setAmount("");
    setNote("");
  }
  async function del(t: Txn) {
    await db.txns.delete(t.id);
  }

  const { income, expense, byCat } = useMemo(() => {
    let income = 0;
    let expense = 0;
    const byCat = new Map<string, number>();
    for (const t of txns ?? []) {
      if (t.type === "income") income += t.amount;
      else {
        expense += t.amount;
        byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
      }
    }
    return { income, expense, byCat };
  }, [txns]);

  const net = income - expense;
  const catRows = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  const maxCat = catRows.length ? catRows[0][1] : 1;

  return (
    <div>
      <h1>Деньги</h1>
      <div className="muted" style={{ marginTop: -8, marginBottom: 12 }}>
        {MONTHS[ym.month]} {ym.year}
      </div>

      <div className="card center">
        <div className="muted">Баланс за месяц</div>
        <div className={`balance ${net >= 0 ? "pos" : "neg"}`}>{money(net)}</div>
        <div className="row" style={{ gap: 10, marginTop: 10 }}>
          <div className="grow">
            <div className="muted">Доходы</div>
            <div style={{ color: "var(--green)", fontWeight: 700 }}>{money(income)}</div>
          </div>
          <div className="grow">
            <div className="muted">Расходы</div>
            <div style={{ color: "var(--red)", fontWeight: 700 }}>{money(expense)}</div>
          </div>
        </div>
      </div>

      <h2>Добавить</h2>
      <div className="card">
        <div className="seg" style={{ marginBottom: 10 }}>
          <button className={type === "expense" ? "on" : "ghost"} onClick={() => setKind("expense")}>Расход</button>
          <button className={type === "income" ? "on" : "ghost"} onClick={() => setKind("income")}>Доход</button>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <input
            type="text"
            inputMode="decimal"
            placeholder="Сумма, ₽"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="grow"
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "auto", flex: "1 1 40%" }}>
            {cats.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <input type="text" placeholder="комментарий (необязательно)" value={note} onChange={(e) => setNote(e.target.value)} className="grow" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: "auto" }} />
        </div>
        <button className="primary" style={{ marginTop: 10, width: "100%" }} onClick={add} disabled={!amount.trim()}>
          Добавить {type === "expense" ? "расход" : "доход"}
        </button>
      </div>

      {catRows.length > 0 && (
        <>
          <h2>Расходы по категориям</h2>
          <div className="card">
            {catRows.map(([cat, sum]) => (
              <div key={cat} style={{ marginBottom: 8 }}>
                <div className="row spread" style={{ marginBottom: 3 }}>
                  <span>{cat}</span>
                  <span className="muted">{money(sum)}</span>
                </div>
                <div style={{ height: 8, background: "var(--surface-2)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${(sum / maxCat) * 100}%`, height: "100%", background: "var(--accent)" }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2>Операции месяца</h2>
      {(!txns || txns.length === 0) && <div className="empty">Пока пусто. Добавьте первую операцию выше.</div>}
      {txns && txns.length > 0 && (
        <div className="card">
          {txns.map((t) => (
            <div key={t.id} className="txn-row">
              <div className="grow">
                <div>{t.category}{t.note ? ` · ${t.note}` : ""}</div>
                <div className="muted">{t.date}</div>
              </div>
              <div className="row" style={{ gap: 10 }}>
                <span className={`txn-amt ${t.type}`} style={{ fontWeight: 700 }}>
                  {t.type === "income" ? "+" : "−"}{money(t.amount).replace(" ₽", "")}
                </span>
                <button className="ghost small" onClick={() => del(t)} aria-label="Удалить">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
