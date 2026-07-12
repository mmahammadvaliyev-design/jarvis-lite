-- Добавляет настройки напоминаний о еде: время + вкл/выкл на устройство,
-- плюс служебные поля для «не слать дважды в один день» и «отложить на N минут».
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
