// Вызывается по расписанию (см. supabase/cron.sql) — раз в 15 минут.
// Проверяет локальное время каждого устройства и рассылает push, если пора
// напомнить про воду или бюджет. Битые/просроченные подписки удаляет сами.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const WATER_TIMES = ["10:00", "13:00", "16:00", "19:00"];
const MONEY_TIMES = ["14:00", "20:00"];

const WATER_LINES = [
  "Время попить воды 💧 Пара глотков — и голова свежее.",
  "Глоток воды — маленькая забота о себе 💧 Сделай прямо сейчас.",
  "Не забывай про воду 💧 Тело скажет спасибо.",
];

function localHHMM(timezone: string): string {
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: false });
    return fmt.format(new Date());
  } catch {
    // неизвестный часовой пояс — считаем как UTC
    const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", hour12: false });
    return fmt.format(new Date());
  }
}

webpush.setVapidDetails(
  "mailto:jarvis-app@example.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

Deno.serve(async (_req) => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: subs, error } = await supabase.from("push_subscriptions").select("*");
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "content-type": "application/json" } });
  }

  const results: { device: string; sent?: string; error?: string }[] = [];

  for (const sub of subs ?? []) {
    const hhmm = localHHMM(sub.timezone);
    const toSend: { title: string; body: string; tag: string }[] = [];

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

    for (const n of toSend) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(n),
        );
        results.push({ device: sub.device_id, sent: n.tag });
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // подписка больше не действительна (отписался/удалил приложение) — чистим
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
