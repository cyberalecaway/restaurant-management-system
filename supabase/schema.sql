-- HBA Kitchen initial schema. Apply this in a fresh Supabase project.
-- No demo rows are inserted; add real branch data after the project is connected.

create extension if not exists pgcrypto;

create type public.app_role as enum ('ADMIN', 'STAFF', 'CUSTOMER');
create type public.account_status as enum ('ACTIVE', 'INACTIVE');
create type public.menu_availability as enum ('Available', 'Sold Out');
create type public.order_status as enum ('PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  mobile text,
  role public.app_role not null default 'CUSTOMER',
  status public.account_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  availability public.menu_availability not null default 'Available',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  customer_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  customer_email text,
  table_label text not null default 'Takeout',
  status public.order_status not null default 'PENDING',
  subtotal numeric(10,2) not null default 0 check (subtotal >= 0),
  notes text,
  cancel_reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  item_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  line_total numeric(10,2) generated always as (quantity * unit_price) stored
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details text not null default '',
  created_at timestamptz not null default now()
);

create index orders_status_created_at_idx on public.orders (status, created_at desc);
create index orders_customer_id_created_at_idx on public.orders (customer_id, created_at desc);
create index order_items_order_id_idx on public.order_items (order_id);
create index activity_logs_created_at_idx on public.activity_logs (created_at desc);

create or replace function public.is_staff_or_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('ADMIN'::public.app_role, 'STAFF'::public.app_role)
      and status = 'ACTIVE'::public.account_status
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'ADMIN'::public.app_role
      and status = 'ACTIVE'::public.account_status
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, mobile, role)
  values (
    new.id,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), nullif(btrim(new.raw_user_meta_data ->> 'given_name'), ''), ''), 120),
    new.email,
    new.raw_user_meta_data ->> 'mobile',
    'CUSTOMER'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_order_item_price()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  menu_item public.menu_items%rowtype;
begin
  if new.menu_item_id is not null then
    select * into menu_item from public.menu_items where id = new.menu_item_id;
    if not found or menu_item.availability <> 'Available' then
      raise exception 'This menu item is not available';
    end if;
    new.item_name := menu_item.name;
    new.unit_price := menu_item.price;
  end if;
  return new;
end;
$$;

create trigger order_item_use_menu_price
  before insert or update of menu_item_id, quantity on public.order_items
  for each row execute procedure public.set_order_item_price();

create or replace function public.prepare_new_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.is_staff_or_admin()) then
    new.customer_id := (select auth.uid());
    new.created_by := (select auth.uid());
    new.status := 'PENDING';
    new.subtotal := 0;
    select coalesce(nullif(full_name, ''), new.customer_name) into new.customer_name
      from public.profiles where id = (select auth.uid());
  end if;
  return new;
end;
$$;

create trigger prepare_order_before_insert
  before insert on public.orders
  for each row execute procedure public.prepare_new_order();

create or replace function public.refresh_order_subtotal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order uuid := coalesce(new.order_id, old.order_id);
begin
  update public.orders
  set subtotal = coalesce((select sum(line_total) from public.order_items where order_id = target_order), 0),
      updated_at = now()
  where id = target_order;
  return coalesce(new, old);
end;
$$;

create trigger update_order_subtotal
  after insert or update or delete on public.order_items
  for each row execute procedure public.refresh_order_subtotal();

alter table public.profiles enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.activity_logs enable row level security;

revoke all on public.profiles, public.menu_items, public.orders, public.order_items, public.activity_logs from anon, authenticated;
grant select on public.menu_items to anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.menu_items, public.orders, public.order_items, public.activity_logs to authenticated;
grant usage, select on all sequences in schema public to authenticated;

create policy "Users see own profile; staff see all profiles"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_staff_or_admin()));
create policy "Admins update profiles"
  on public.profiles for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Published menu is visible to visitors"
  on public.menu_items for select to anon, authenticated
  using (availability = 'Available' or (select public.is_staff_or_admin()));
create policy "Staff manage menu"
  on public.menu_items for all to authenticated
  using ((select public.is_staff_or_admin())) with check ((select public.is_staff_or_admin()));

create policy "Customers see own orders; staff see branch orders"
  on public.orders for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_staff_or_admin()));
create policy "Customers create own pending orders; staff create orders"
  on public.orders for insert to authenticated
  with check (
    (customer_id = (select auth.uid()) and status = 'PENDING')
    or (select public.is_staff_or_admin())
  );
create policy "Staff update orders"
  on public.orders for update to authenticated
  using ((select public.is_staff_or_admin()))
  with check ((select public.is_staff_or_admin()));

create policy "Users see permitted order items"
  on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));
create policy "Customers add items to own pending orders; staff manage items"
  on public.order_items for insert to authenticated
  with check (
    (select public.is_staff_or_admin())
    or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid()) and o.status = 'PENDING')
  );
create policy "Staff update order items"
  on public.order_items for update to authenticated
  using ((select public.is_staff_or_admin())) with check ((select public.is_staff_or_admin()));
create policy "Staff delete order items"
  on public.order_items for delete to authenticated
  using ((select public.is_staff_or_admin()));

create policy "Staff read activity logs"
  on public.activity_logs for select to authenticated
  using ((select public.is_staff_or_admin()));
create policy "Staff write activity logs"
  on public.activity_logs for insert to authenticated
  with check ((select public.is_staff_or_admin()) and (actor_id = (select auth.uid())));
