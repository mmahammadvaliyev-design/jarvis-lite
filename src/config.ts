// Публичные значения — безопасно хранить в коде, это не секреты.
// URL и anon key заполняются после того, как проект Supabase будет создан.
export const SUPABASE_FUNCTIONS_URL = ""; // напр. "https://xxxxx.functions.supabase.co"
export const SUPABASE_ANON_KEY = ""; // "anon public" ключ из Project Settings → API

// Публичный VAPID-ключ для Web Push (приватный лежит только в секретах Supabase).
export const VAPID_PUBLIC_KEY =
  "BDkk0PAvBD9Y2G70-bOAtgJdiaj-VKqtEoG8Cq4jw4C1s3CzzwdsiOAILAn5jEGVF-6ykjHTTmLn0aO7Ns9nXyQ";

export const PUSH_CONFIGURED = Boolean(SUPABASE_FUNCTIONS_URL && SUPABASE_ANON_KEY);
