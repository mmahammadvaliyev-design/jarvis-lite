import { useEffect, useState } from "react";
import { CURRENCIES, db, getProfile, todayStr, type Profile } from "../db";
import { INTEREST_TAGS } from "../content/suggestions";
import { notificationsSupported, requestNotifPermission } from "../logic/notify";
import { disableDemo, enableDemo } from "../seed";
import { PUSH_CONFIGURED } from "../config";
import { subscribeToPush } from "../logic/push";

export default function Settings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [custom, setCustom] = useState("");
  const [saved, setSaved] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);

  useEffect(() => {
    getProfile().then(setProfile);
  }, []);

  if (!profile) return <div>…</div>;

  function patch(p: Partial<Profile>) {
    setProfile((prev) => (prev ? { ...prev, ...p } : prev));
    setSaved(false);
  }

  function toggleInterest(tag: string) {
    const has = profile!.interests.includes(tag);
    patch({
      interests: has ? profile!.interests.filter((x) => x !== tag) : [...profile!.interests, tag],
    });
  }

  function addCustom() {
    const tag = custom.trim().toLowerCase();
    if (tag && !profile!.interests.includes(tag)) {
      patch({ interests: [...profile!.interests, tag] });
    }
    setCustom("");
  }

  async function save() {
    await db.profile.put(profile!);
    setSaved(true);
    // Синхронизируем настройки напоминаний с сервером — вода и бюджет теперь
    // приходят настоящим push, даже если приложение закрыто.
    if (profile!.notifications && PUSH_CONFIGURED) {
      await subscribeToPush({ water: profile!.waterReminders, money: profile!.moneyReminders });
    }
  }

  async function toggleDemo(on: boolean) {
    setDemoBusy(true);
    try {
      if (on) await enableDemo();
      else await disableDemo();
      setProfile(await getProfile());
    } finally {
      setDemoBusy(false);
    }
  }

  function toggleQuit(on: boolean) {
    patch({ quitSmoking: on, quitDate: on ? (profile!.quitDate ?? todayStr()) : profile!.quitDate });
  }

  async function toggleNotifications(on: boolean) {
    if (on) {
      const granted = await requestNotifPermission();
      patch({ notifications: granted });
      if (!granted) {
        alert("Браузер не разрешил уведомления. Включите их в настройках сайта и попробуйте снова.");
        return;
      }
      if (PUSH_CONFIGURED) {
        await subscribeToPush({ water: profile!.waterReminders, money: profile!.moneyReminders });
      }
    } else {
      patch({ notifications: false });
    }
  }

  const BREAK_OPTIONS = [
    { v: 0, label: "по ходу дня" },
    { v: 45, label: "каждые 45 мин" },
    { v: 60, label: "каждый час" },
    { v: 90, label: "каждые 1.5 часа" },
  ];

  const allTags = Array.from(new Set([...INTEREST_TAGS, ...profile.interests]));

  return (
    <div>
      <h1>Настройки</h1>

      <h2>Интересы (для предложений в свободное время)</h2>
      <div className="card">
        <div className="row wrap" style={{ gap: 8 }}>
          {allTags.map((tag) => {
            const on = profile.interests.includes(tag);
            return (
              <button
                key={tag}
                className={on ? "primary small" : "ghost small"}
                onClick={() => toggleInterest(tag)}
              >
                {on ? "✓ " : ""}{tag}
              </button>
            );
          })}
        </div>
        <div className="row" style={{ gap: 8, marginTop: 12 }}>
          <input
            type="text"
            placeholder="свой интерес…"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
          />
          <button className="small" onClick={addCustom}>Добавить</button>
        </div>
      </div>

      <h2>Режим дня</h2>
      <div className="card">
        <div className="row" style={{ gap: 12 }}>
          <label className="grow" style={{ margin: 0 }}>
            Подъём
            <input type="time" value={profile.wakeTime} onChange={(e) => patch({ wakeTime: e.target.value })} />
          </label>
          <label className="grow" style={{ margin: 0 }}>
            Сон
            <input type="time" value={profile.sleepTime} onChange={(e) => patch({ sleepTime: e.target.value })} />
          </label>
        </div>
        <div className="row" style={{ gap: 12, marginTop: 10 }}>
          <label className="grow" style={{ margin: 0 }}>
            Работа с
            <input type="time" value={profile.workStart} onChange={(e) => patch({ workStart: e.target.value })} />
          </label>
          <label className="grow" style={{ margin: 0 }}>
            Работа до
            <input type="time" value={profile.workEnd} onChange={(e) => patch({ workEnd: e.target.value })} />
          </label>
        </div>
      </div>

      <h2>Активность и перерывы</h2>
      <div className="card">
        <label style={{ margin: "0 0 6px" }}>Разминки-перерывы</label>
        <div className="seg" style={{ marginBottom: 12 }}>
          {BREAK_OPTIONS.map((o) => (
            <button
              key={o.v}
              className={profile.breakEveryMin === o.v ? "on" : "ghost"}
              onClick={() => patch({ breakEveryMin: o.v })}
              style={{ fontSize: 12, padding: "8px 6px" }}
            >
              {o.label}
            </button>
          ))}
        </div>
        <label className="row spread" style={{ margin: 0, alignItems: "center", cursor: "pointer" }}>
          <span>Разминка в перерывах (отжаться/присесть)</span>
          <input
            type="checkbox"
            checked={profile.wantMovement}
            onChange={(e) => patch({ wantMovement: e.target.checked })}
            style={{ width: 20, height: 20 }}
          />
        </label>
      </div>

      <h2>Уведомления о перерывах</h2>
      <div className="card">
        <label className="row spread" style={{ margin: 0, alignItems: "center", cursor: "pointer" }}>
          <span>Напоминать «пора передохнуть» с фактом и разминкой</span>
          <input
            type="checkbox"
            checked={profile.notifications}
            onChange={(e) => toggleNotifications(e.target.checked)}
            disabled={!notificationsSupported()}
            style={{ width: 20, height: 20 }}
          />
        </label>
        <label className="row spread" style={{ margin: "12px 0 0", alignItems: "center", cursor: "pointer" }}>
          <span>Напоминать про бюджет днём и вечером (записать доходы/расходы)</span>
          <input
            type="checkbox"
            checked={profile.moneyReminders}
            onChange={(e) => patch({ moneyReminders: e.target.checked })}
            style={{ width: 20, height: 20 }}
          />
        </label>
        <label className="row spread" style={{ margin: "12px 0 0", alignItems: "center", cursor: "pointer" }}>
          <span>Напоминать пить воду несколько раз в день 💧</span>
          <input
            type="checkbox"
            checked={profile.waterReminders}
            onChange={(e) => patch({ waterReminders: e.target.checked })}
            style={{ width: 20, height: 20 }}
          />
        </label>
        <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>
          {PUSH_CONFIGURED ? (
            <>
              Напоминания про воду и бюджет приходят по-настоящему — даже если приложение закрыто.
              Про перерывы (факт + слово + разминка) — пока только пока приложение открыто, это отдельная
              история, зависящая от твоего плана на день.
            </>
          ) : (
            <>Работают, только пока приложение открыто. Настоящие push-уведомления ещё не подключены.</>
          )}
          {" "}Напоминание про бюджет также показывается в самом разделе «Бюджет».
        </p>
      </div>

      <h2>Валюта (раздел «Бюджет»)</h2>
      <div className="card">
        <div className="row wrap" style={{ gap: 8 }}>
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              className={profile.currency === c.code ? "primary small" : "ghost small"}
              onClick={() => patch({ currency: c.code })}
            >
              {c.symbol} {c.label}
            </button>
          ))}
        </div>
      </div>

      <h2>Здоровье</h2>
      <div className="card">
        <label className="row spread" style={{ margin: 0, alignItems: "center", cursor: "pointer" }}>
          <span>Я бросаю курить 🚭 (помощь вместо сигареты)</span>
          <input
            type="checkbox"
            checked={profile.quitSmoking}
            onChange={(e) => toggleQuit(e.target.checked)}
            style={{ width: 20, height: 20 }}
          />
        </label>
        <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>
          На главном появится счётчик дней без сигарет и кнопка «тянет закурить» — она предложит, чем заняться вместо.
        </p>
      </div>

      <h2>Демо-режим</h2>
      <div className="card">
        <label className="row spread" style={{ margin: 0, alignItems: "center", cursor: "pointer" }}>
          <span>Показать демо-данные (для просмотра)</span>
          <input
            type="checkbox"
            checked={profile.demoMode}
            disabled={demoBusy}
            onChange={(e) => toggleDemo(e.target.checked)}
            style={{ width: 20, height: 20 }}
          />
        </label>
        <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>
          Заполнит приложение примерами (задачи, бюджет, привычка со стриком). <b style={{ color: "var(--text)" }}>Твои настоящие данные сохранятся</b> и вернутся, когда выключишь демо.
        </p>
      </div>

      <div className="row" style={{ gap: 8, marginTop: 16 }}>
        <button className="primary grow" onClick={save}>Сохранить</button>
        {saved && <span className="muted">✓ сохранено</span>}
      </div>

      <p className="muted center" style={{ marginTop: 24 }}>
        Задачи, бюджет и привычки хранятся только на этом устройстве, в браузере — никуда не уходят.
        {PUSH_CONFIGURED && profile.notifications && (
          <> Для push-уведомлений на сервер уходит только техническая подписка устройства (без содержимого задач и бюджета).</>
        )}
      </p>
    </div>
  );
}
