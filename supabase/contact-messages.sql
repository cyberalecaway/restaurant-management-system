-- Public customer contact form submissions and staff/admin inbox.
-- The checked-in schema has no existing contact or message table.

do $$
begin
  if to_regclass('public.profiles') is null or to_regprocedure('public.is_staff_or_admin()') is null then
    raise exception 'Run schema.sql before contact-messages.sql.';
  end if;
end;
$$;

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  created_at timestamptz not null default now(),
  constraint contact_messages_name_length_check check (length(btrim(name)) between 1 and 120),
  constraint contact_messages_email_check check (length(btrim(email)) between 3 and 254 and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  constraint contact_messages_subject_length_check check (length(btrim(subject)) between 1 and 160),
  constraint contact_messages_message_length_check check (length(btrim(message)) between 1 and 5000)
);

create index if not exists contact_messages_created_at_idx on public.contact_messages (created_at desc);
alter table public.contact_messages enable row level security;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'contact_messages') then
    alter publication supabase_realtime add table public.contact_messages;
  end if;
end;
$$;

revoke all on public.contact_messages from public, anon, authenticated;
grant insert (user_id, name, email, subject, message) on public.contact_messages to anon, authenticated;
grant select on public.contact_messages to authenticated;

drop policy if exists "Guests submit contact messages" on public.contact_messages;
create policy "Guests submit contact messages"
  on public.contact_messages for insert to anon
  with check (user_id is null);

drop policy if exists "Signed-in users submit contact messages" on public.contact_messages;
create policy "Signed-in users submit contact messages"
  on public.contact_messages for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Staff and admins read contact messages" on public.contact_messages;
create policy "Staff and admins read contact messages"
  on public.contact_messages for select to authenticated
  using ((select public.is_staff_or_admin()));
