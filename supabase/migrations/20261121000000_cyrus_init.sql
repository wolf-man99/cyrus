-- ════════════════════════════════════════════════════════════════════
--  CYRUS — initial schema
--  Every user-owned table:
--    • has user_id defaulting to auth.uid() (clients never send ownership)
--    • has Row Level Security enabled, scoped to the signed-in user
--    • validates input with CHECK constraints (mirrors src/domain/schemas.ts)
-- ════════════════════════════════════════════════════════════════════

create type public.life_domain as enum (
  'physical', 'mental', 'intellectual', 'financial', 'social', 'career', 'entrepreneurship'
);

-- Shared trigger: keep updated_at current.
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ─────────────────────────── Profiles ───────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text check (char_length(display_name) <= 60),
  weight_unit   text not null default 'kg' check (weight_unit in ('kg', 'lb')),
  currency      text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  timezone      text not null default 'UTC' check (char_length(timezone) <= 64),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Create a profile row for every new auth user.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 60), ''));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────── Tasks ───────────────────────────
-- A task with a due_time is a "commitment". Future-dated tasks are "upcoming activities".
create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title         text not null check (char_length(btrim(title)) between 1 and 200),
  notes         text check (char_length(notes) <= 2000),
  domain        public.life_domain,
  due_date      date,
  due_time      time,
  is_priority   boolean not null default false,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index tasks_user_due_idx on public.tasks (user_id, due_date);
create trigger tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();

-- ─────────────────────────── Habits ───────────────────────────
create table public.habits (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null check (char_length(btrim(title)) between 1 and 60),
  icon         text not null default 'sparkles' check (icon ~ '^[a-z-]{1,32}$'),
  domain       public.life_domain,
  sort_order   integer not null default 0,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (id, user_id)
);
create index habits_user_idx on public.habits (user_id) where archived_at is null;

create table public.habit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id    uuid not null,
  log_date    date not null,
  created_at  timestamptz not null default now(),
  unique (habit_id, log_date),
  -- Composite FK guarantees a user can only log their own habits.
  foreign key (habit_id, user_id) references public.habits (id, user_id) on delete cascade
);
create index habit_logs_user_date_idx on public.habit_logs (user_id, log_date);

-- ─────────────────────────── Physical ───────────────────────────
create table public.weight_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  value       numeric(5, 1) not null check (value > 0 and value < 1000),
  unit        text not null check (unit in ('kg', 'lb')),
  note        text check (char_length(note) <= 280),
  logged_at   timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index weight_logs_user_idx on public.weight_logs (user_id, logged_at desc);

create table public.body_measurements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('waist', 'chest', 'hips', 'arm', 'thigh', 'neck', 'body_fat')),
  value       numeric(6, 2) not null check (value > 0),
  unit        text not null check (unit in ('cm', 'in', '%')),
  logged_at   timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index body_measurements_user_idx on public.body_measurements (user_id, logged_at desc);

create table public.workouts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workout_type  text not null check (char_length(workout_type) between 1 and 40),
  duration_min  integer not null check (duration_min between 1 and 600),
  intensity     text check (intensity in ('easy', 'moderate', 'hard')),
  notes         text check (char_length(notes) <= 1000),
  performed_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index workouts_user_idx on public.workouts (user_id, performed_at desc);

-- Health report files live in the private `health-reports` storage bucket (see below).
create table public.health_reports (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title         text not null check (char_length(btrim(title)) between 1 and 120),
  storage_path  text not null check (char_length(storage_path) <= 512),
  report_date   date,
  notes         text check (char_length(notes) <= 2000),
  created_at    timestamptz not null default now()
);

-- ─────────────────────────── Financial ───────────────────────────
create table public.transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind         text not null check (kind in ('expense', 'income')),
  amount       numeric(12, 2) not null check (amount > 0 and amount <= 1000000),
  currency     text not null check (currency ~ '^[A-Z]{3}$'),
  category     text not null check (char_length(category) between 1 and 40),
  note         text check (char_length(note) <= 140),
  occurred_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index transactions_user_idx on public.transactions (user_id, occurred_at desc);

-- ─────────────────────────── Goals & domain activity ───────────────────────────
create table public.goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  domain         public.life_domain not null,
  title          text not null check (char_length(btrim(title)) between 1 and 120),
  description    text check (char_length(description) <= 2000),
  target_value   numeric(14, 2),
  current_value  numeric(14, 2) not null default 0,
  unit           text check (char_length(unit) <= 20),
  target_date    date,
  status         text not null default 'active' check (status in ('active', 'completed', 'paused', 'archived')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index goals_user_domain_idx on public.goals (user_id, domain);
create trigger goals_touch before update on public.goals
  for each row execute function public.touch_updated_at();

-- Generic activity log for every domain (meditation, reading, courses, talks, milestones…).
create table public.domain_activities (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  domain       public.life_domain not null,
  kind         text not null check (kind ~ '^[a-z_]{1,32}$'),
  title        text not null check (char_length(btrim(title)) between 1 and 160),
  value        numeric(14, 2),
  unit         text check (char_length(unit) <= 20),
  details      jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  occurred_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index domain_activities_user_domain_idx on public.domain_activities (user_id, domain, occurred_at desc);

-- ─────────────────────────── Reflections ───────────────────────────
create table public.reflections (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  period        text not null check (period in ('daily', 'weekly', 'monthly')),
  period_start  date not null,
  mood          smallint check (mood between 1 and 5),
  energy        smallint check (energy between 1 and 5),
  responses     jsonb not null default '{}'::jsonb
                  check (jsonb_typeof(responses) = 'object' and octet_length(responses::text) <= 20000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, period, period_start)
);
create trigger reflections_touch before update on public.reflections
  for each row execute function public.touch_updated_at();

-- ─────────────────────────── Assistant history ───────────────────────────
create table public.assistant_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text check (char_length(title) <= 120),
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  unique (id, user_id)
);

create table public.assistant_messages (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  conversation_id  uuid not null,
  role             text not null check (role in ('user', 'assistant')),
  content          text not null check (char_length(content) between 1 and 8000),
  created_at       timestamptz not null default now(),
  foreign key (conversation_id, user_id)
    references public.assistant_conversations (id, user_id) on delete cascade
);
create index assistant_messages_conversation_idx on public.assistant_messages (conversation_id, created_at);

-- ════════════════════════════════════════════════════════════════════
--  Row Level Security
-- ════════════════════════════════════════════════════════════════════

alter table public.profiles enable row level security;
create policy "profiles: read own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles: update own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Owner-only CRUD on every user-owned table.
do $$
declare
  t text;
begin
  foreach t in array array[
    'tasks', 'habits', 'habit_logs', 'weight_logs', 'body_measurements', 'workouts',
    'health_reports', 'transactions', 'goals', 'domain_activities', 'reflections',
    'assistant_conversations', 'assistant_messages'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "%1$s: select own" on public.%1$I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s: insert own" on public.%1$I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s: update own" on public.%1$I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s: delete own" on public.%1$I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end;
$$;

-- ════════════════════════════════════════════════════════════════════
--  Storage — private health report files, one folder per user: <user_id>/<file>
-- ════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'health-reports', 'health-reports', false, 20971520,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp']
)
on conflict (id) do nothing;

create policy "health-reports: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'health-reports' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "health-reports: upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'health-reports' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "health-reports: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'health-reports' and (storage.foldername(name))[1] = (select auth.uid())::text);
