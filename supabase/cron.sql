-- Запускает send-reminders каждые 15 минут. Выполнить в SQL Editor ПОСЛЕ того,
-- как функция send-reminders задеплоена (иначе URL будет отвечать 404).
--
-- Замени два плейсхолдера ниже:
--   YOUR_PROJECT_REF — из адреса твоего проекта, https://<REF>.supabase.co
--   YOUR_ANON_KEY     — Project Settings → API → anon public key

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'jarvis-send-reminders',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_ANON_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Проверить, что задача создана:
-- select * from cron.job;

-- Удалить задачу (если понадобится пересоздать):
-- select cron.unschedule('jarvis-send-reminders');
