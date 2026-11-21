-- Data written with the first schema; the Track/Reflect migration must carry it over.
insert into auth.users (id, email) values ('11111111-1111-4111-8111-111111111111', 'legacy@example.com');
insert into public.transactions (user_id, kind, amount, currency, category, note)
values
  ('11111111-1111-4111-8111-111111111111', 'expense', 12.50, 'USD', 'Food', 'Lunch'),
  ('11111111-1111-4111-8111-111111111111', 'income', 2500.00, 'USD', 'Salary', null);
insert into public.body_measurements (user_id, kind, value, unit)
values ('11111111-1111-4111-8111-111111111111', 'waist', 84.5, 'cm');
insert into public.domain_activities (user_id, domain, kind, title, value, unit)
values ('11111111-1111-4111-8111-111111111111', 'mental', 'meditation', 'Morning sit', 10, 'min');
insert into public.assistant_conversations (id, user_id, title)
values ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'First chat');
insert into public.assistant_messages (user_id, conversation_id, role, content)
values ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'user', 'Hello');
