// Публичные значения — безопасно хранить в коде, это не секреты.
export const SUPABASE_FUNCTIONS_URL = "https://hpvteflbxvtdgsjanboj.supabase.co/functions/v1";
export const SUPABASE_ANON_KEY = "sb_publishable_Cv_jHywSGaf0WLxzvSwybg__dZHLIIb";

// Публичный VAPID-ключ для Web Push (приватный лежит только в секретах Supabase).
export const VAPID_PUBLIC_KEY =
  "BDkk0PAvBD9Y2G70-bOAtgJdiaj-VKqtEoG8Cq4jw4C1s3CzzwdsiOAILAn5jEGVF-6ykjHTTmLn0aO7Ns9nXyQ";

export const PUSH_CONFIGURED = Boolean(SUPABASE_FUNCTIONS_URL && SUPABASE_ANON_KEY);
