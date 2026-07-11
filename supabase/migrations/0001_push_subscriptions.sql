-- Таблица push-подписок устройств. Без аккаунтов — одно устройство = одна строка,
-- идентификатор генерируется в браузере (случайный UUID, не персональные данные).
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  timezone text not null default 'UTC',
  water_reminders boolean not null default true,
  money_reminders boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS включён, но политик для anon/authenticated не создаём — по умолчанию доступ
-- запрещён всем, кроме service_role (его использует код внутри Edge Functions).
-- Так клиент никогда не читает и не пишет в таблицу напрямую, только через функции.
alter table push_subscriptions enable row level security;
