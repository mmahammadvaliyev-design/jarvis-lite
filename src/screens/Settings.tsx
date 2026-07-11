import { useEffect, useState } from "react";
import { db, getProfile, type Profile } from "../db";
import { INTEREST_TAGS } from "../content/suggestions";

export default function Settings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [custom, setCustom] = useState("");
  const [saved, setSaved] = useState(false);

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
  }

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

      <div className="row" style={{ gap: 8, marginTop: 12 }}>
        <button className="primary grow" onClick={save}>Сохранить</button>
        {saved && <span className="muted">✓ сохранено</span>}
      </div>

      <p className="muted center" style={{ marginTop: 24 }}>
        Все данные хранятся только на этом устройстве, в браузере. Ничего не уходит в сеть.
      </p>
    </div>
  );
}
