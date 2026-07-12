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
