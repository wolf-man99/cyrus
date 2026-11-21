-- ════════════════════════════════════════════════════════════════════
--  CYRUS — Track, Reflect and assistant schema
--  Non-destructive: tables are renamed, and rows are copied into their new
--  home before a superseded table is dropped, all in this one transaction.
-- ════════════════════════════════════════════════════════════════════

-- ─────────────────────────── Goals ───────────────────────────
alter table public.goals
  add column start_value numeric(14, 2),
  add column category text check (category ~ '^[a-z_]{1,32}$'),
  add column archived_at timestamptz,
  add constraint goals_id_user_unique unique (id, user_id);

-- ─────────────────────────── Activity logs ───────────────────────────
-- The generic per-domain activity stream (meditation, reading, talks, achievements…).
alter table public.domain_activities rename to activity_logs;
alter index public.domain_activities_user_domain_idx rename to activity_logs_user_domain_idx;
alter policy "domain_activities: select own" on public.activity_logs rename to "activity_logs: select own";
alter policy "domain_activities: insert own" on public.activity_logs rename to "activity_logs: insert own";
alter policy "domain_activities: update own" on public.activity_logs rename to "activity_logs: update own";
alter policy "domain_activities: delete own" on public.activity_logs rename to "activity_logs: delete own";

alter table public.activity_logs
  add column notes text check (char_length(notes) <= 4000),
  add column goal_id uuid,
  add constraint activity_logs_goal_fk foreign key (goal_id, user_id)
    references public.goals (id, user_id) on delete set null (goal_id);
create index activity_logs_goal_idx on public.activity_logs (goal_id) where goal_id is not null;
create index activity_logs_user_time_idx on public.activity_logs (user_id, occurred_at desc);

-- Record every change to a goal's progress so progress can be charted over time.
create function public.log_goal_progress()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.current_value is distinct from old.current_value then
    insert into public.activity_logs (user_id, domain, kind, title, value, unit, goal_id)
    values (new.user_id, new.domain, 'goal_progress', new.title, new.current_value, new.unit, new.id);
  end if;
  return new;
end;
$$;
create trigger goals_log_progress after update of current_value on public.goals
  for each row execute function public.log_goal_progress();

-- ─────────────────────────── Domain metrics ───────────────────────────
-- Numeric time series: mood, energy, body measurements, savings and debt balances…
create table public.domain_metrics (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  domain       public.life_domain not null,
  metric       text not null check (metric ~ '^[a-z_]{1,32}$'),
  value        numeric(14, 2) not null,
  unit         text check (char_length(unit) <= 12),
  note         text check (char_length(note) <= 500),
  recorded_at  timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  constraint domain_metrics_scale check (metric not in ('mood', 'energy') or value between 1 and 5)
);
create index domain_metrics_user_metric_idx on public.domain_metrics (user_id, metric, recorded_at desc);

-- Body measurements move into domain metrics.
insert into public.domain_metrics (user_id, domain, metric, value, unit, recorded_at, created_at)
select user_id, 'physical', kind, value, unit, logged_at, created_at from public.body_measurements;
drop table public.body_measurements;

-- ─────────────────────────── Workouts ───────────────────────────
alter table public.workouts
  add column exercises jsonb not null default '[]'::jsonb
    check (jsonb_typeof(exercises) = 'array' and jsonb_array_length(exercises) <= 50);

-- ─────────────────────────── Health reports ───────────────────────────
alter table public.health_reports
  add column file_name text check (char_length(file_name) <= 255),
  add column mime_type text check (char_length(mime_type) <= 100),
  add column size_bytes bigint check (size_bytes between 0 and 20971520);

-- ─────────────────────────── Money ───────────────────────────
create table public.expenses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount       numeric(12, 2) not null check (amount > 0 and amount <= 1000000),
  currency     text not null check (currency ~ '^[A-Z]{3}$'),
  category     text not null check (char_length(category) between 1 and 40),
  note         text check (char_length(note) <= 140),
  occurred_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index expenses_user_time_idx on public.expenses (user_id, occurred_at desc);

create table public.income (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount       numeric(12, 2) not null check (amount > 0 and amount <= 100000000),
  currency     text not null check (currency ~ '^[A-Z]{3}$'),
  source       text not null check (char_length(source) between 1 and 60),
  note         text check (char_length(note) <= 140),
  received_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index income_user_time_idx on public.income (user_id, received_at desc);

-- Existing transactions move into expenses and income.
insert into public.expenses (id, user_id, amount, currency, category, note, occurred_at, created_at)
select id, user_id, amount, currency, category, note, occurred_at, created_at
from public.transactions where kind = 'expense';
insert into public.income (id, user_id, amount, currency, source, note, received_at, created_at)
select id, user_id, amount, currency, category, note, occurred_at, created_at
from public.transactions where kind = 'income';
drop table public.transactions;

create table public.investments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name              text not null check (char_length(btrim(name)) between 1 and 80),
  kind              text not null check (kind in ('stocks', 'funds', 'crypto', 'bonds', 'property', 'retirement', 'cash', 'other')),
  invested_amount   numeric(14, 2) not null default 0 check (invested_amount >= 0),
  current_value     numeric(14, 2) not null default 0 check (current_value >= 0),
  currency          text not null check (currency ~ '^[A-Z]{3}$'),
  value_updated_at  timestamptz not null default now(),
  archived_at       timestamptz,
  created_at        timestamptz not null default now()
);
create index investments_user_idx on public.investments (user_id) where archived_at is null;

-- ─────────────────────────── Learning, skills, projects ───────────────────────────
create table public.learning_resources (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind          text not null check (kind in ('book', 'course', 'article', 'video', 'podcast')),
  title         text not null check (char_length(btrim(title)) between 1 and 160),
  author        text check (char_length(author) <= 120),
  status        text not null default 'active' check (status in ('planned', 'active', 'completed', 'paused')),
  progress      numeric(8, 1) not null default 0 check (progress >= 0),
  total         numeric(8, 1) check (total > 0),
  unit          text not null default 'pages' check (unit in ('pages', 'lessons', 'chapters', 'hours', 'percent')),
  rating        smallint check (rating between 1 and 5),
  notes         text check (char_length(notes) <= 4000),
  started_at    date,
  completed_at  date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint learning_progress_within_total check (total is null or progress <= total)
);
create index learning_resources_user_idx on public.learning_resources (user_id, status);
create trigger learning_resources_touch before update on public.learning_resources
  for each row execute function public.touch_updated_at();

create table public.skills (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  domain        public.life_domain not null check (domain in ('intellectual', 'career')),
  name          text not null check (char_length(btrim(name)) between 1 and 80),
  level         smallint not null default 1 check (level between 1 and 5),
  target_level  smallint check (target_level between 1 and 5),
  notes         text check (char_length(notes) <= 1000),
  archived_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index skills_user_idx on public.skills (user_id, domain) where archived_at is null;
create trigger skills_touch before update on public.skills
  for each row execute function public.touch_updated_at();

create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  domain        public.life_domain not null check (domain in ('career', 'entrepreneurship')),
  kind          text not null check (kind in ('project', 'idea', 'venture', 'experiment')),
  title         text not null check (char_length(btrim(title)) between 1 and 120),
  description   text check (char_length(description) <= 2000),
  status        text not null default 'active' check (status in ('idea', 'active', 'paused', 'completed', 'dropped')),
  hypothesis    text check (char_length(hypothesis) <= 1000),
  outcome       text check (char_length(outcome) <= 2000),
  started_at    date,
  completed_at  date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index projects_user_idx on public.projects (user_id, domain, status);
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

-- ─────────────────────────── Reflections ───────────────────────────
-- Per-domain 1–5 ratings, validated server-side.
create function public.valid_domain_ratings(ratings jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(ratings) = 'object'
    and not exists (
      select 1 from jsonb_each(ratings) as r(key, value)
      where r.key not in ('physical', 'mental', 'intellectual', 'financial', 'social', 'career', 'entrepreneurship')
         or jsonb_typeof(r.value) <> 'number'
         or (r.value)::numeric not in (1, 2, 3, 4, 5)
    );
$$;

alter table public.reflections
  add column domain_ratings jsonb not null default '{}'::jsonb
    check (public.valid_domain_ratings(domain_ratings)),
  add constraint reflections_id_user_unique unique (id, user_id);

-- Goals a reflection talks about.
create table public.reflection_goals (
  reflection_id  uuid not null,
  goal_id        uuid not null,
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (reflection_id, goal_id),
  foreign key (reflection_id, user_id) references public.reflections (id, user_id) on delete cascade,
  foreign key (goal_id, user_id) references public.goals (id, user_id) on delete cascade
);
create index reflection_goals_goal_idx on public.reflection_goals (goal_id);

-- ─────────────────────────── Assistant memory ───────────────────────────
alter table public.assistant_conversations rename to conversations;
alter table public.assistant_messages rename to messages;
alter index public.assistant_messages_conversation_idx rename to messages_conversation_idx;
alter policy "assistant_conversations: select own" on public.conversations rename to "conversations: select own";
alter policy "assistant_conversations: insert own" on public.conversations rename to "conversations: insert own";
alter policy "assistant_conversations: update own" on public.conversations rename to "conversations: update own";
alter policy "assistant_conversations: delete own" on public.conversations rename to "conversations: delete own";
alter policy "assistant_messages: select own" on public.messages rename to "messages: select own";
alter policy "assistant_messages: insert own" on public.messages rename to "messages: insert own";
alter policy "assistant_messages: update own" on public.messages rename to "messages: update own";
alter policy "assistant_messages: delete own" on public.messages rename to "messages: delete own";

alter table public.conversations add column updated_at timestamptz not null default now();
create index conversations_user_recent_idx on public.conversations (user_id, updated_at desc);

-- Actions the assistant carried out in this turn, e.g. [{"capability":"log_weight","summary":"Logged 91.5 kg"}]
alter table public.messages
  add column actions jsonb not null default '[]'::jsonb
    check (jsonb_typeof(actions) = 'array' and octet_length(actions::text) <= 8000);

create function public.touch_conversation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;
create trigger messages_touch_conversation after insert on public.messages
  for each row execute function public.touch_conversation();

-- ─────────────────────────── Row Level Security for new tables ───────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'domain_metrics', 'expenses', 'income', 'investments',
    'learning_resources', 'skills', 'projects', 'reflection_goals'
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
