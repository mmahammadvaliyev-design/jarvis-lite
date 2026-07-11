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
    prefs?: { water?: boolean; money?: boolean };
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
