# Обновление: напоминания о еде

Это добавка к тому, что уже настроено — проект, таблица, функции и расписание трогать не нужно,
просто три маленьких шага. Новые ключи/секреты не нужны, значения тебе присылать не нужно —
всё уже подключено в коде.

## Шаг 1 — новая колонка в таблице

1. Supabase → **SQL Editor** → **New query**.
2. Вставь и нажми **Run**:

```sql
alter table push_subscriptions
  add column if not exists wake_time text not null default '07:30',
  add column if not exists morning_reminders boolean not null default true,
  add column if not exists morning_sent_date text,
  add column if not exists morning_snooze_until timestamptz,
  add column if not exists lunch_time text not null default '13:00',
  add column if not exists lunch_reminders boolean not null default true,
  add column if not exists lunch_sent_date text,
  add column if not exists lunch_snooze_until timestamptz,
  add column if not exists dinner_time text not null default '19:00',
  add column if not exists dinner_reminders boolean not null default true,
  add column if not exists dinner_sent_date text,
  add column if not exists dinner_snooze_until timestamptz;
```

Ожидай: «Success. No rows returned».

## Шаг 2 — обновить функцию `subscribe`

1. **Edge Functions** → открой существующую функцию **subscribe**.
2. Найди кнопку редактирования кода (обычно «Edit function» / иконка карандаша).
3. Удали весь код, вставь новый:

```ts
// Принимает push-подписку от устройства и сохраняет/обновляет её в базе.
// Клиент вызывает это с anon-ключом (только для авторизации вызова функции);
// сама запись в таблицу идёт через service_role — RLS не даёт анониму писать напрямую.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
    });
  }

  let body: {
    deviceId?: string;
    subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    timezone?: string;
    prefs?: {
      water?: boolean;
      money?: boolean;
      wakeTime?: string;
      morning?: boolean;
      lunchTime?: string;
      lunch?: boolean;
      dinnerTime?: string;
      dinner?: boolean;
    };
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
    });
  }

  const { deviceId, subscription, timezone, prefs } = body;
  if (!deviceId || !subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return new Response(JSON.stringify({ error: "missing deviceId or subscription" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
    });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      device_id: deviceId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      timezone: timezone || "UTC",
      water_reminders: prefs?.water ?? true,
      money_reminders: prefs?.money ?? true,
      wake_time: prefs?.wakeTime || "07:30",
      morning_reminders: prefs?.morning ?? true,
      lunch_time: prefs?.lunchTime || "13:00",
      lunch_reminders: prefs?.lunch ?? true,
      dinner_time: prefs?.dinnerTime || "19:00",
      dinner_reminders: prefs?.dinner ?? true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "device_id" },
  );

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...CORS_HEADERS, "content-type": "application/json" },
  });
});
```

4. **Deploy**.

## Шаг 3 — обновить функцию `send-reminders`

1. **Edge Functions** → открой существующую **send-reminders**.
2. Удали весь код, вставь новый:

```ts
// Вызывается по расписанию (см. supabase/cron.sql) — раз в 15 минут.
// Проверяет локальное время каждого устройства и рассылает push: вода, бюджет,
// доброе утро/завтрак, обед, ужин. Битые/просроченные подписки удаляет сами.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const WATER_TIMES = ["10:00", "13:00", "16:00", "19:00"];
const MONEY_TIMES = ["14:00", "20:00"];

const WATER_LINES = [
  "Время попить воды 💧 Пара глотков — и голова свежее.",
  "Глоток воды — маленькая забота о себе 💧 Сделай прямо сейчас.",
  "Не забывай про воду 💧 Тело скажет спасибо.",
];

const PUBLIC_ANON_KEY = "sb_publishable_Cv_jHywSGaf0WLxzvSwybg__dZHLIIb";

const MEAL_CONTENT = [
  "💡 Осьминоги видят цвета кожей, хотя сами частично дальтоники.",
  "💡 Мёд не портится тысячи лет — археологи находили съедобный мёд в гробницах фараонов.",
  "💡 Сердце синего кита размером с малолитражку и весит около 180 кг.",
  "🧩 Загадка: что становится больше, если его перевернуть вверх ногами? (число 6)",
  "💡 У человека и банана совпадает около половины генов.",
  "🧩 Загадка: у отца Марии пять дочерей — Чача, Чече, Чичи, Чочо и… кто пятая? (сама Мария)",
  "💡 Один вдох человека содержит молекулы воздуха, которым дышал Юлий Цезарь.",
  "💡 Языку хамелеона для выстрела нужно меньше 20 миллисекунд.",
  "🧩 Загадка: в тёмной комнате 10 чёрных и 10 синих носков. Сколько взять не глядя, чтобы точно была пара? (три)",
  "💡 Кошки не различают сладкий вкус — у них сломан нужный ген.",
  "💡 Свет от Солнца идёт до Земли 8 минут 20 секунд.",
  "🧩 Загадка: горело 7 свечей, 2 потушили. Сколько останется утром? (две — потушенные)",
  "💡 Вомбат какает кубиками — так метки не скатываются с камней.",
  "💡 Слово «робот» придумал чешский писатель Карел Чапек в 1920 году.",
];

function pickMealContent(): string {
  return MEAL_CONTENT[Math.floor(Math.random() * MEAL_CONTENT.length)];
}

function localHHMM(timezone: string): string {
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: false });
    return fmt.format(new Date());
  } catch {
    const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", hour12: false });
    return fmt.format(new Date());
  }
}

function localDateStr(timezone: string): string {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" });
    return fmt.format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return h * 60 + m;
}

function inWindow(targetHHMM: string, nowHHMM: string): boolean {
  const target = toMin(targetHHMM);
  const now = toMin(nowHHMM);
  return now >= target && now < target + 15;
}

webpush.setVapidDetails(
  "mailto:jarvis-app@example.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

interface Sub {
  device_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  timezone: string;
  water_reminders: boolean;
  money_reminders: boolean;
  wake_time: string;
  morning_reminders: boolean;
  morning_sent_date: string | null;
  morning_snooze_until: string | null;
  lunch_time: string;
  lunch_reminders: boolean;
  lunch_sent_date: string | null;
  lunch_snooze_until: string | null;
  dinner_time: string;
  dinner_reminders: boolean;
  dinner_sent_date: string | null;
  dinner_snooze_until: string | null;
}

type Meal = "morning" | "lunch" | "dinner";

function shouldFireMeal(targetHHMM: string, sentDate: string | null, snoozeUntil: string | null, nowHHMM: string, today: string): boolean {
  if (sentDate === today) return false;
  const nowIso = new Date().toISOString();
  if (snoozeUntil) {
    if (snoozeUntil > nowIso) return false;
    return true;
  }
  return inWindow(targetHHMM, nowHHMM);
}

Deno.serve(async (_req) => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const functionsUrl = `${Deno.env.get("SUPABASE_URL")!}/functions/v1`;
  const { data: subs, error } = await supabase.from("push_subscriptions").select("*");
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "content-type": "application/json" } });
  }

  const results: { device: string; sent?: string; error?: string }[] = [];

  for (const sub of (subs ?? []) as Sub[]) {
    const hhmm = localHHMM(sub.timezone);
    const today = localDateStr(sub.timezone);
    const toSend: { title: string; body: string; tag: string; meal?: Meal }[] = [];

    if (sub.water_reminders && WATER_TIMES.includes(hhmm)) {
      const body = WATER_LINES[Math.floor(Math.random() * WATER_LINES.length)];
      toSend.push({ title: "Джарвис · вода", body, tag: "jarvis-water" });
    }
    if (sub.money_reminders && MONEY_TIMES.includes(hhmm)) {
      toSend.push({
        title: "Джарвис · бюджет",
        body: "Не забудь записать, сколько сегодня заработал и потратил — это важно для бюджета.",
        tag: "jarvis-money",
      });
    }

    const mealUpdates: Record<string, string | null> = {};

    if (sub.morning_reminders && shouldFireMeal(sub.wake_time, sub.morning_sent_date, sub.morning_snooze_until, hhmm, today)) {
      toSend.push({ title: "Доброе утро ☀️", body: "Вставай и иди завтракать — хорошего дня!", tag: "jarvis-morning", meal: "morning" });
      mealUpdates.morning_sent_date = today;
      mealUpdates.morning_snooze_until = null;
    }
    if (sub.lunch_reminders && shouldFireMeal(sub.lunch_time, sub.lunch_sent_date, sub.lunch_snooze_until, hhmm, today)) {
      toSend.push({ title: "Обед 🍲", body: `Время пообедать. ${pickMealContent()}`, tag: "jarvis-lunch", meal: "lunch" });
      mealUpdates.lunch_sent_date = today;
      mealUpdates.lunch_snooze_until = null;
    }
    if (sub.dinner_reminders && shouldFireMeal(sub.dinner_time, sub.dinner_sent_date, sub.dinner_snooze_until, hhmm, today)) {
      toSend.push({ title: "Ужин 🍽", body: `Время поужинать. ${pickMealContent()}`, tag: "jarvis-dinner", meal: "dinner" });
      mealUpdates.dinner_sent_date = today;
      mealUpdates.dinner_snooze_until = null;
    }

    if (Object.keys(mealUpdates).length > 0) {
      await supabase.from("push_subscriptions").update(mealUpdates).eq("device_id", sub.device_id);
    }

    for (const n of toSend) {
      const payload: Record<string, unknown> = { title: n.title, body: n.body, tag: n.tag };
      if (n.meal) {
        payload.actions = [{ action: "snooze30", title: "+30 мин" }];
        payload.data = { kind: "meal", meal: n.meal, deviceId: sub.device_id, functionsUrl, anonKey: PUBLIC_ANON_KEY };
      }
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
        results.push({ device: sub.device_id, sent: n.tag });
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("device_id", sub.device_id);
        }
        results.push({ device: sub.device_id, error: String(e) });
      }
    }
  }

  return new Response(JSON.stringify({ checked: subs?.length ?? 0, results }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});
```

3. **Deploy**.

## Шаг 4 — новая функция `snooze`

1. **Edge Functions** → **Create a new function**.
2. Имя — строго: `snooze`
3. Вставь код:

```ts
// Откладывает конкретное напоминание о еде на N минут. Вызывается либо кликом
// по кнопке в самом push-уведомлении (через service worker), либо из приложения.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_MEALS = ["morning", "lunch", "dinner"] as const;
type Meal = (typeof VALID_MEALS)[number];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
    });
  }

  let body: { deviceId?: string; meal?: string; minutes?: number };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
    });
  }

  const { deviceId, meal } = body;
  const minutes = Math.min(180, Math.max(5, body.minutes ?? 30));

  if (!deviceId || !meal || !VALID_MEALS.includes(meal as Meal)) {
    return new Response(JSON.stringify({ error: "invalid deviceId or meal" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
    });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const until = new Date(Date.now() + minutes * 60_000).toISOString();

  const { error } = await supabase
    .from("push_subscriptions")
    .update({ [`${meal}_snooze_until`]: until })
    .eq("device_id", deviceId);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, until }), {
    status: 200,
    headers: { ...CORS_HEADERS, "content-type": "application/json" },
  });
});
```

4. **Deploy**.

## Готово

Никаких новых секретов, никаких новых значений присылать не нужно. После этих 4 шагов напиши «готово» — я проверю со своей стороны, что всё отвечает как надо, и задеплою обновлённое приложение (там появятся настройки времени завтрака/обеда/ужина).
