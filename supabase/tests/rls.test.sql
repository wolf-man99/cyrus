-- Row Level Security, ownership and validation tests.
-- Each block acts as a signed-in user by setting the role and JWT claims Supabase would set.
\set ON_ERROR_STOP 1
\o /dev/null
set client_min_messages = warning;

create or replace function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;

create or replace function pg_temp.expect_error(stmt text, label text) returns void language plpgsql as $$
begin
  execute stmt;
  raise exception 'FAIL: % — statement should have been rejected', label;
exception
  when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
end $$;

-- Two users. The signup trigger must create their profiles.
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'a@example.com', '{"display_name":"Ada"}'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', 'b@example.com', '{}');

do $$ begin
  assert (select count(*) from public.profiles) = 3, 'profiles created by signup trigger (incl. legacy user)';
  assert (select display_name from public.profiles where id = 'aaaaaaaa-0000-4000-8000-00000000000a') = 'Ada', 'display name copied';
end $$;

-- ── Data from the first schema survived the migration ──
do $$ begin
  assert (select count(*) from public.expenses where note = 'Lunch' and amount = 12.50) = 1, 'expense migrated';
  assert (select count(*) from public.income where source = 'Salary' and amount = 2500) = 1, 'income migrated';
  assert (select count(*) from public.domain_metrics where metric = 'waist' and value = 84.5) = 1, 'measurement migrated';
  assert (select count(*) from public.activity_logs where kind = 'meditation') = 1, 'activity renamed in place';
  assert (select count(*) from public.messages m join public.conversations c on c.id = m.conversation_id) = 1, 'conversation + message renamed in place';
end $$;

-- ── User A writes data ──
begin;
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-00000000000a');
insert into public.tasks (id, title, due_date) values ('aaaaaaaa-1111-4000-8000-000000000001', 'A task', current_date);
insert into public.habits (id, title) values ('aaaaaaaa-2222-4000-8000-000000000001', 'A habit');
insert into public.habit_logs (habit_id, log_date) values ('aaaaaaaa-2222-4000-8000-000000000001', current_date);
insert into public.goals (id, domain, title, target_value, start_value, current_value, unit)
  values ('aaaaaaaa-3333-4000-8000-000000000001', 'physical', 'Reach 76 kg', 76, 80, 80, 'kg');
insert into public.weight_logs (value, unit) values (79.4, 'kg');
insert into public.expenses (amount, currency, category) values (9.99, 'USD', 'Food');
insert into public.domain_metrics (domain, metric, value) values ('mental', 'mood', 4);
insert into public.reflections (id, period, period_start, responses, domain_ratings)
  values ('aaaaaaaa-4444-4000-8000-000000000001', 'weekly', current_date, '{"lessons":"Sleep early"}', '{"physical":4,"career":3}');
insert into public.reflection_goals (reflection_id, goal_id)
  values ('aaaaaaaa-4444-4000-8000-000000000001', 'aaaaaaaa-3333-4000-8000-000000000001');
insert into public.conversations (id, title) values ('aaaaaaaa-5555-4000-8000-000000000001', 'Chat');
insert into public.messages (conversation_id, role, content) values ('aaaaaaaa-5555-4000-8000-000000000001', 'user', 'Hi');
insert into storage.objects (bucket_id, name) values ('health-reports', 'aaaaaaaa-0000-4000-8000-00000000000a/blood.pdf');

do $$ begin
  assert (select user_id from public.tasks where id = 'aaaaaaaa-1111-4000-8000-000000000001') = 'aaaaaaaa-0000-4000-8000-00000000000a',
    'user_id defaults to auth.uid()';
  assert (select count(*) from public.profiles) = 1, 'A sees only her own profile';
end $$;

-- Progress history is written by the goals trigger.
update public.goals set current_value = 79.4 where id = 'aaaaaaaa-3333-4000-8000-000000000001';
do $$ begin
  assert (select count(*) from public.activity_logs where goal_id = 'aaaaaaaa-3333-4000-8000-000000000001' and kind = 'goal_progress' and value = 79.4) = 1,
    'goal progress logged';
end $$;

-- Ownership cannot be spoofed.
select pg_temp.expect_error($$insert into public.tasks (title, user_id) values ('spoof', 'bbbbbbbb-0000-4000-8000-00000000000b')$$, 'insert as another user');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('health-reports', 'bbbbbbbb-0000-4000-8000-00000000000b/x.pdf')$$, 'upload into another user folder');
commit;

-- ── User B cannot see or touch A's rows ──
begin;
select pg_temp.act_as('bbbbbbbb-0000-4000-8000-00000000000b');
do $$ declare n int; begin
  assert (select count(*) from public.tasks) = 0, 'B cannot read A tasks';
  assert (select count(*) from public.goals) = 0, 'B cannot read A goals';
  assert (select count(*) from public.weight_logs) = 0, 'B cannot read A weight';
  assert (select count(*) from public.expenses) = 0, 'B cannot read A expenses (or legacy rows)';
  assert (select count(*) from public.reflections) = 0, 'B cannot read A reflections';
  assert (select count(*) from public.messages) = 0, 'B cannot read A messages';
  assert (select count(*) from storage.objects where bucket_id = 'health-reports') = 0, 'B cannot list A reports';
  update public.tasks set title = 'hacked' where id = 'aaaaaaaa-1111-4000-8000-000000000001';
  get diagnostics n = row_count; assert n = 0, 'B cannot update A task';
  delete from public.goals where id = 'aaaaaaaa-3333-4000-8000-000000000001';
  get diagnostics n = row_count; assert n = 0, 'B cannot delete A goal';
end $$;
-- Composite foreign keys stop B from attaching rows to A's records.
select pg_temp.expect_error($$insert into public.habit_logs (habit_id, log_date) values ('aaaaaaaa-2222-4000-8000-000000000001', current_date - 1)$$, 'log A habit as B');
select pg_temp.expect_error($$insert into public.activity_logs (domain, kind, title, goal_id) values ('physical', 'note', 'x', 'aaaaaaaa-3333-4000-8000-000000000001')$$, 'link activity to A goal');
select pg_temp.expect_error($$insert into public.messages (conversation_id, role, content) values ('aaaaaaaa-5555-4000-8000-000000000001', 'user', 'x')$$, 'write into A conversation');
commit;

-- ── Anonymous requests see nothing ──
begin;
select set_config('role', 'anon', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  assert (select count(*) from public.tasks) = 0, 'anon sees no tasks';
  assert (select count(*) from public.profiles) = 0, 'anon sees no profiles';
  assert (select count(*) from storage.objects) = 0, 'anon sees no stored files';
end $$;
select pg_temp.expect_error($$insert into public.tasks (title) values ('anon write')$$, 'anon cannot write');
commit;

-- ── Server-side validation ──
begin;
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-00000000000a');
select pg_temp.expect_error($$insert into public.weight_logs (value, unit) values (0, 'kg')$$, 'weight must be positive');
select pg_temp.expect_error($$insert into public.weight_logs (value, unit) values (80, 'stone')$$, 'weight unit');
select pg_temp.expect_error($$insert into public.domain_metrics (domain, metric, value) values ('mental', 'mood', 6)$$, 'mood is 1-5');
select pg_temp.expect_error($$insert into public.expenses (amount, currency, category) values (-5, 'USD', 'Food')$$, 'expense must be positive');
select pg_temp.expect_error($$insert into public.expenses (amount, currency, category) values (5, 'usd', 'Food')$$, 'currency code');
select pg_temp.expect_error($$insert into public.tasks (title) values ('   ')$$, 'blank task title');
select pg_temp.expect_error($$insert into public.reflections (period, period_start, domain_ratings) values ('daily', current_date, '{"spiritual":3}')$$, 'unknown domain rating key');
select pg_temp.expect_error($$insert into public.reflections (period, period_start, domain_ratings) values ('daily', current_date, '{"career":7}')$$, 'domain rating range');
select pg_temp.expect_error($$insert into public.learning_resources (kind, title, progress, total) values ('book', 'Dune', 500, 400)$$, 'progress within total');
select pg_temp.expect_error($$insert into public.projects (domain, kind, title) values ('physical', 'idea', 'x')$$, 'projects only in career/entrepreneurship');
select pg_temp.expect_error($$insert into public.reflections (period, period_start) values ('weekly', current_date)$$, 'one reflection per period start');
commit;

-- ── Conversation recency is maintained by trigger ──
do $$ begin
  assert (select updated_at >= (select max(created_at) from public.messages where conversation_id = c.id)
          from public.conversations c where c.id = 'aaaaaaaa-5555-4000-8000-000000000001'), 'conversation touched on new message';
end $$;

-- ── Every user-owned table has RLS enabled ──
do $$ declare missing text; begin
  select string_agg(c.relname, ', ') into missing
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  assert missing is null, format('tables without RLS: %s', missing);
end $$;

\o
\echo 'rls + validation: all assertions passed'
