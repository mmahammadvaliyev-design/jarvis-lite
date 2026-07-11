# Настройка push-уведомлений (Supabase)

Всё делается через сайт supabase.com, без терминала. Занимает ~10 минут. Стоимость — $0 (бесплатный тариф с большим запасом).

## 1. Создать проект

1. Зайти на [supabase.com](https://supabase.com) → Sign up (можно через Google/GitHub) → New Project.
2. Указать имя (например `jarvis-lite`), придумать пароль для базы (сохрани его, но мне присылать не нужно), выбрать регион (ближайший).
3. Подождать ~2 минуты, пока проект поднимется.

## 2. Создать таблицу

1. В меню слева — **SQL Editor** → New query.
2. Открыть файл `supabase/migrations/0001_push_subscriptions.sql` из этого проекта, скопировать содержимое, вставить в редактор.
3. Нажать **Run**.

## 3. Задеплоить функции

Для каждой из двух функций:

1. Меню слева — **Edge Functions** → Create a new function.
2. Имя — **строго** `subscribe` (для первой) и `send-reminders` (для второй).
3. Вставить содержимое соответствующего файла:
   - `supabase/functions/subscribe/index.ts`
   - `supabase/functions/send-reminders/index.ts`
4. Deploy.

## 4. Добавить секреты

Меню слева — **Edge Functions** → **Manage secrets** (или Settings → Edge Functions).
Добавить две переменные (значения — из VAPID-ключей, которые уже сгенерированы):

| Имя | Значение |
|---|---|
| `VAPID_PUBLIC_KEY` | `BDkk0PAvBD9Y2G70-bOAtgJdiaj-VKqtEoG8Cq4jw4C1s3CzzwdsiOAILAn5jEGVF-6ykjHTTmLn0aO7Ns9nXyQ` |
| `VAPID_PRIVATE_KEY` | `3RZILjQhHB2W22GUruoEZhmHl5G5I-W2U97gN3wYfEc` |

`SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` добавлять не нужно — Supabase сам прокидывает их в каждую функцию.

## 5. Настроить расписание рассылки

1. **SQL Editor** → New query.
2. Открыть `supabase/cron.sql`, заменить в нём:
   - `YOUR_PROJECT_REF` — это видно в адресе проекта или в Project Settings → API → Project URL (часть до `.supabase.co`).
   - `YOUR_ANON_KEY` — там же, Project Settings → API → `anon` `public` key.
3. Вставить получившийся текст в редактор, нажать **Run**.

## 6. Прислать мне два значения

Project Settings → API — там будет:
- **Project URL** (пример: `https://abcdefgh.supabase.co`)
- **anon public key** (длинная строка)

Оба значения **не секретные** — anon-ключ специально предназначен для использования в браузере, его можно спокойно прислать в чат. Я подставлю их в `src/config.ts`, соберу и задеплою — уведомления заработают.

## Проверка (после того как всё готово)

В Supabase → Edge Functions → `send-reminders` → там есть кнопка «Invoke» — можно вызвать вручную и посмотреть логи, не дожидаясь расписания.
