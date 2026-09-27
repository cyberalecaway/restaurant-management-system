-- Apply after the original schema.sql is installed.
-- First run data-quality-checks.sql and fix every returned row.

alter table public.orders add column if not exists checkout_key uuid;

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
    'CUSTOMER'::public.app_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

do $$
begin
  if exists (
    select 1 from public.menu_items
    group by lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')),
             lower(regexp_replace(btrim(category), '[[:space:]]+', ' ', 'g'))
    having count(*) > 1
  ) then
    raise exception 'Duplicate menu names exist. Run data-quality-checks.sql and resolve duplicates first.';
  end if;
  if exists (select 1 from public.profiles group by lower(btrim(email)) having count(*) > 1) then
    raise exception 'Duplicate profile emails exist. Run data-quality-checks.sql and resolve duplicates first.';
  end if;
end;
$$;

create unique index if not exists menu_items_name_category_unique_idx
  on public.menu_items (lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')), lower(regexp_replace(btrim(category), '[[:space:]]+', ' ', 'g')));
create unique index if not exists profiles_email_normalized_unique_idx on public.profiles (lower(btrim(email)));
create unique index if not exists orders_customer_checkout_key_unique_idx on public.orders (customer_id, checkout_key) where checkout_key is not null;

revoke insert on public.orders from authenticated;
revoke insert on public.order_items from authenticated;
drop policy if exists "Customers create own pending orders; staff create orders" on public.orders;
drop policy if exists "Customers add items to own pending orders; staff manage items" on public.order_items;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.profiles'::regclass and conname = 'profiles_full_name_length_check') then
    alter table public.profiles add constraint profiles_full_name_length_check check (length(btrim(full_name)) <= 120);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.profiles'::regclass and conname = 'profiles_email_length_check') then
    alter table public.profiles add constraint profiles_email_length_check check (length(btrim(email)) between 3 and 254);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.profiles'::regclass and conname = 'profiles_mobile_length_check') then
    alter table public.profiles add constraint profiles_mobile_length_check check (mobile is null or length(btrim(mobile)) <= 20);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.menu_items'::regclass and conname = 'menu_items_name_length_check') then
    alter table public.menu_items add constraint menu_items_name_length_check check (length(btrim(name)) between 1 and 120);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.menu_items'::regclass and conname = 'menu_items_category_length_check') then
    alter table public.menu_items add constraint menu_items_category_length_check check (length(btrim(category)) between 1 and 60);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.menu_items'::regclass and conname = 'menu_items_description_length_check') then
    alter table public.menu_items add constraint menu_items_description_length_check check (length(description) <= 1000);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.menu_items'::regclass and conname = 'menu_items_price_range_check') then
    alter table public.menu_items add constraint menu_items_price_range_check check (price > 0 and price <= 100000);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.orders'::regclass and conname = 'orders_customer_name_length_check') then
    alter table public.orders add constraint orders_customer_name_length_check check (length(btrim(customer_name)) between 1 and 120);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.orders'::regclass and conname = 'orders_customer_email_length_check') then
    alter table public.orders add constraint orders_customer_email_length_check check (customer_email is null or length(btrim(customer_email)) <= 254);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.orders'::regclass and conname = 'orders_table_label_length_check') then
    alter table public.orders add constraint orders_table_label_length_check check (length(btrim(table_label)) between 1 and 80);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.orders'::regclass and conname = 'orders_notes_length_check') then
    alter table public.orders add constraint orders_notes_length_check check (notes is null or length(notes) <= 1000);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.orders'::regclass and conname = 'orders_cancel_reason_length_check') then
    alter table public.orders add constraint orders_cancel_reason_length_check check (cancel_reason is null or length(cancel_reason) <= 500);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.order_items'::regclass and conname = 'order_items_quantity_range_check') then
    alter table public.order_items add constraint order_items_quantity_range_check check (quantity between 1 and 99);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.order_items'::regclass and conname = 'order_items_unit_price_range_check') then
    alter table public.order_items add constraint order_items_unit_price_range_check check (unit_price > 0 and unit_price <= 100000);
  end if;
end;
$$;

create or replace function public.create_customer_order(p_checkout_key uuid, p_items jsonb, p_table_label text default 'Takeout', p_notes text default null)
returns table (id uuid, order_number bigint, subtotal numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  v_order_id uuid;
  duplicate_count integer;
  total_quantity integer;
  item jsonb;
  item_count integer;
begin
  if current_user_id is null then raise exception 'Sign in before placing an order' using errcode = '28000'; end if;
  if not exists (select 1 from public.profiles where profiles.id = current_user_id and profiles.role = 'CUSTOMER'::public.app_role and profiles.status = 'ACTIVE'::public.account_status) then
    raise exception 'An active customer account is required to place an order' using errcode = '42501';
  end if;
  if p_checkout_key is null then raise exception 'Checkout key is required' using errcode = '22023'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'Order items must be a JSON array' using errcode = '22023'; end if;
  item_count := jsonb_array_length(p_items);
  if item_count < 1 or item_count > 30 then raise exception 'An order must contain between 1 and 30 different items' using errcode = '22023'; end if;
  if p_table_label is null or length(btrim(p_table_label)) not between 1 and 80 then raise exception 'Order type must be 1 to 80 characters' using errcode = '22023'; end if;
  if p_notes is not null and length(p_notes) > 1000 then raise exception 'Order notes must be 1000 characters or fewer' using errcode = '22023'; end if;

  for item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(item -> 'menu_item_id') is distinct from 'string'
      or (item ->> 'menu_item_id') is null
      or (item ->> 'menu_item_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or jsonb_typeof(item -> 'quantity') is distinct from 'number'
      or (item ->> 'quantity') is null
      or (item ->> 'quantity') !~ '^[1-9][0-9]*$' then
      raise exception 'Each order item needs a valid menu id and a quantity from 1 to 99' using errcode = '22023';
    end if;
    if (item ->> 'quantity')::numeric > 99 then raise exception 'Each order item quantity must be 99 or fewer' using errcode = '22023'; end if;
  end loop;
  select count(*) - count(distinct (value ->> 'menu_item_id')::uuid), sum((value ->> 'quantity')::integer)
    into duplicate_count, total_quantity from jsonb_array_elements(p_items);
  if duplicate_count > 0 then raise exception 'Each menu item may appear only once in an order' using errcode = '22023'; end if;
  if total_quantity > 999 then raise exception 'An order can contain at most 999 items' using errcode = '22023'; end if;

  select orders.id into v_order_id from public.orders where orders.customer_id = current_user_id and orders.checkout_key = p_checkout_key;
  if found then
    return query select orders.id, orders.order_number, orders.subtotal from public.orders where orders.id = v_order_id;
    return;
  end if;
  insert into public.orders (customer_name, customer_email, table_label, notes, checkout_key)
  select coalesce(nullif(profiles.full_name, ''), 'Customer'), profiles.email, btrim(p_table_label), nullif(btrim(coalesce(p_notes, '')), ''), p_checkout_key
  from public.profiles where profiles.id = current_user_id
  on conflict (customer_id, checkout_key) where checkout_key is not null do nothing
  returning orders.id into v_order_id;
  if v_order_id is null then
    select orders.id into v_order_id from public.orders where orders.customer_id = current_user_id and orders.checkout_key = p_checkout_key;
    return query select orders.id, orders.order_number, orders.subtotal from public.orders where orders.id = v_order_id;
    return;
  end if;
  insert into public.order_items (order_id, menu_item_id, item_name, quantity, unit_price)
  select v_order_id, (value ->> 'menu_item_id')::uuid, '', (value ->> 'quantity')::integer, 1 from jsonb_array_elements(p_items);
  return query select orders.id, orders.order_number, orders.subtotal from public.orders where orders.id = v_order_id;
end;
$$;

revoke all on function public.create_customer_order(uuid, jsonb, text, text) from public;
grant execute on function public.create_customer_order(uuid, jsonb, text, text) to authenticated;

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists menu_items_set_updated_at on public.menu_items;
create trigger menu_items_set_updated_at before update on public.menu_items for each row execute procedure public.set_updated_at();
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders for each row execute procedure public.set_updated_at();

create or replace function public.validate_order_status_transition() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status is distinct from old.status
    and not ((old.status = 'PENDING' and new.status in ('PREPARING', 'CANCELLED'))
      or (old.status = 'PREPARING' and new.status in ('READY', 'CANCELLED'))
      or (old.status = 'READY' and new.status in ('COMPLETED', 'CANCELLED'))) then
    raise exception 'Invalid order status change from % to %', old.status, new.status using errcode = '22023';
  end if;
  return new;
end;
$$;
drop trigger if exists orders_validate_status_transition on public.orders;
create trigger orders_validate_status_transition before update of status on public.orders for each row execute procedure public.validate_order_status_transition();

create or replace function public.record_business_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  activity_action text;
  activity_details text;
begin
  if tg_table_name = 'menu_items' then
    if tg_op = 'INSERT' then activity_action := 'Added menu item'; activity_details := left(new.name, 120);
    elsif tg_op = 'UPDATE' then activity_action := 'Updated menu item'; activity_details := left(new.name, 120);
    else activity_action := 'Deleted menu item'; activity_details := left(old.name, 120); end if;
  elsif tg_table_name = 'orders' then
    if tg_op = 'INSERT' then activity_action := 'Created order'; activity_details := 'Order #' || new.order_number::text;
    else activity_action := 'Changed order status'; activity_details := 'Order #' || new.order_number::text || ': ' || old.status::text || ' to ' || new.status::text; end if;
  else
    activity_action := 'Updated user access';
    activity_details := 'Profile ' || new.id::text || ': ' || old.role::text || '/' || old.status::text || ' to ' || new.role::text || '/' || new.status::text;
  end if;
  insert into public.activity_logs (actor_id, action, details) values ((select auth.uid()), activity_action, activity_details);
  return coalesce(new, old);
end;
$$;
drop trigger if exists menu_items_activity_log on public.menu_items;
create trigger menu_items_activity_log after insert or update or delete on public.menu_items for each row execute procedure public.record_business_activity();
drop trigger if exists orders_created_activity_log on public.orders;
create trigger orders_created_activity_log after insert on public.orders for each row execute procedure public.record_business_activity();
drop trigger if exists orders_status_activity_log on public.orders;
create trigger orders_status_activity_log after update of status on public.orders for each row when (old.status is distinct from new.status) execute procedure public.record_business_activity();
drop trigger if exists profiles_access_activity_log on public.profiles;
create trigger profiles_access_activity_log after update of role, status on public.profiles for each row when (old.role is distinct from new.role or old.status is distinct from new.status) execute procedure public.record_business_activity();

create or replace function public.prevent_last_active_admin_loss() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  other_active_admins integer;
  remains_admin boolean;
begin
  perform pg_advisory_xact_lock(hashtext('hba_active_admin_guard'));
  if tg_op = 'DELETE' then
    if old.role = 'ADMIN'::public.app_role and old.status = 'ACTIVE'::public.account_status then
      select count(*) into other_active_admins from public.profiles where role = 'ADMIN'::public.app_role and status = 'ACTIVE'::public.account_status and id <> old.id;
      if other_active_admins = 0 then raise exception 'The last active administrator cannot be deleted'; end if;
    end if;
    return old;
  end if;
  if old.role = 'ADMIN'::public.app_role and old.status = 'ACTIVE'::public.account_status then
    select count(*) into other_active_admins from public.profiles where role = 'ADMIN'::public.app_role and status = 'ACTIVE'::public.account_status and id <> old.id;
    remains_admin := new.role = 'ADMIN'::public.app_role and new.status = 'ACTIVE'::public.account_status;
    if other_active_admins = 0 and not remains_admin then raise exception 'The last active administrator cannot be deactivated or demoted'; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_preserve_active_admin on public.profiles;
create trigger profiles_preserve_active_admin before update of role, status or delete on public.profiles for each row execute procedure public.prevent_last_active_admin_loss();
