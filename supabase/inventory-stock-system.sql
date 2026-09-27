-- HBA Kitchen ingredient ledger and recipe-based consumption.
-- Run after schema.sql, quality-controls.sql, restaurant-operations.sql, and menu-stock.sql.
-- This migration is additive. It never resets current stock, menu records, orders, or users.

do $$
begin
  if to_regclass('public.inventory_items') is null
    or to_regclass('public.menu_item_ingredients') is null
    or to_regclass('public.menu_items') is null
    or to_regclass('public.orders') is null
    or to_regclass('public.order_items') is null
    or to_regclass('public.profiles') is null then
    raise exception 'Install the existing HBA schema and restaurant-operations/menu-stock SQL before inventory-stock-system.sql.';
  end if;
  if to_regprocedure('public.is_admin()') is null then
    raise exception 'public.is_admin() is missing. Install the checked-in HBA schema before inventory-stock-system.sql.';
  end if;
  if exists (
    select required.table_name, required.column_name
    from (values
      ('inventory_items','id'), ('inventory_items','name'), ('inventory_items','unit'),
      ('inventory_items','quantity_on_hand'), ('inventory_items','minimum_level'), ('inventory_items','reorder_level'), ('inventory_items','updated_at'),
      ('menu_item_ingredients','menu_item_id'), ('menu_item_ingredients','inventory_item_id'), ('menu_item_ingredients','quantity_per_serving'), ('menu_item_ingredients','unit'),
      ('orders','id'), ('orders','order_number'), ('orders','status'),
      ('order_items','order_id'), ('order_items','menu_item_id'), ('order_items','item_name'), ('order_items','quantity'),
      ('profiles','id'), ('profiles','full_name'), ('profiles','email')
    ) as required(table_name, column_name)
    where not exists (
      select 1 from information_schema.columns c
      where c.table_schema = 'public' and c.table_name = required.table_name and c.column_name = required.column_name
    )
  ) then
    raise exception 'An existing HBA table is missing a required inventory or recipe column. Review the live schema before continuing.';
  end if;
end;
$$;

-- The checked-in schema has no supplier table. Reuse a compatible existing one, or add it.
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  phone text,
  email text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.suppliers add column if not exists contact_name text;
alter table public.suppliers add column if not exists phone text;
alter table public.suppliers add column if not exists email text;
alter table public.suppliers add column if not exists notes text;
alter table public.suppliers add column if not exists is_active boolean not null default true;
alter table public.suppliers add column if not exists created_at timestamptz not null default now();
alter table public.suppliers add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'suppliers' and column_name = 'id' and udt_name = 'uuid'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'suppliers' and column_name = 'name'
  ) then
    raise exception 'A suppliers table exists but is not compatible with HBA inventory. Review it manually; no supplier table was replaced.';
  end if;
  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.suppliers'::regclass and c.contype in ('p','u')
      and pg_get_constraintdef(c.oid) like '%(id)%'
  ) then
    raise exception 'public.suppliers.id needs a primary or unique constraint before stock history can reference suppliers.';
  end if;
  if exists (
    select 1 from public.suppliers
    group by lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')) having count(*) > 1
  ) then
    raise exception 'Duplicate supplier names need to be resolved before the normalized supplier index can be installed.';
  end if;
end;
$$;

create unique index if not exists suppliers_name_normalized_idx
  on public.suppliers (lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')));

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.inventory_items(id) on delete restrict,
  movement_type text not null check (movement_type in ('STOCK_IN','STOCK_OUT','ADJUSTMENT','WASTE','RETURN')),
  quantity numeric(12,3) not null check (quantity > 0),
  previous_quantity numeric(12,3) not null check (previous_quantity >= 0),
  new_quantity numeric(12,3) not null check (new_quantity >= 0),
  unit text not null check (length(btrim(unit)) between 1 and 24),
  reason text not null check (length(btrim(reason)) between 1 and 120),
  supplier_id uuid references public.suppliers(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  notes text check (notes is null or length(notes) <= 2000),
  performed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select required.column_name
    from (values ('id'), ('ingredient_id'), ('movement_type'), ('quantity'), ('previous_quantity'), ('new_quantity'), ('unit'), ('reason'), ('supplier_id'), ('order_id'), ('notes'), ('performed_by'), ('created_at')) as required(column_name)
    where not exists (
      select 1 from information_schema.columns c
      where c.table_schema = 'public' and c.table_name = 'stock_movements' and c.column_name = required.column_name
    )
  ) then
    raise exception 'A stock_movements table exists but does not contain the HBA ledger columns. Review it manually; no movement history was replaced.';
  end if;
  if exists (
    select 1 from public.stock_movements
    where order_id is not null and movement_type = 'STOCK_OUT'
    group by order_id, ingredient_id having count(*) > 1
  ) then
    raise exception 'Duplicate order stock-out movements exist. Reconcile them before enabling idempotent recipe consumption.';
  end if;
  if exists (
    select 1 from public.menu_item_ingredients recipe
    join public.inventory_items ingredient on ingredient.id = recipe.inventory_item_id
    where recipe.unit <> ingredient.unit
  ) then
    raise exception 'Some recipes use a different unit than their inventory ingredient. Correct those recipe units before continuing.';
  end if;
end;
$$;

alter table public.orders add column if not exists ingredients_deducted boolean not null default false;
alter table public.orders add column if not exists ingredients_deducted_at timestamptz;

create index if not exists stock_movements_created_at_idx
  on public.stock_movements (created_at desc);
create index if not exists stock_movements_inventory_item_created_at_idx
  on public.stock_movements (ingredient_id, created_at desc);
create index if not exists stock_movements_supplier_id_idx
  on public.stock_movements (supplier_id) where supplier_id is not null;
create unique index if not exists stock_movements_order_ingredient_stockout_idx
  on public.stock_movements (order_id, ingredient_id)
  where order_id is not null and movement_type = 'STOCK_OUT';

-- Record the current balance once as an opening snapshot when movement tracking is installed.
-- This is explicitly not represented as a historical delivery or a named staff action.
insert into public.stock_movements (
  ingredient_id, movement_type, quantity, previous_quantity, new_quantity, unit,
  reason, notes, performed_by
)
select inventory.id, 'ADJUSTMENT', inventory.quantity_on_hand, 0, inventory.quantity_on_hand, inventory.unit,
  'Opening balance at ledger setup',
  'Snapshot captured when stock movement tracking was installed; not a historical receiving transaction.',
  null
from public.inventory_items inventory
where inventory.quantity_on_hand > 0
  and not exists (
    select 1 from public.stock_movements movement
    where movement.ingredient_id = inventory.id
      and movement.order_id is null
      and movement.reason = 'Opening balance at ledger setup'
  );

-- Replace the prior staff-wide policies with an Admin-only gate. The restrictive
-- policies also block any other permissive policies that may exist on these tables.
drop policy if exists "RMS staff manage inventory" on public.inventory_items;
drop policy if exists "RMS staff manage recipes" on public.menu_item_ingredients;
drop policy if exists "RMS admins manage inventory" on public.inventory_items;
drop policy if exists "RMS admins manage recipes" on public.menu_item_ingredients;
drop policy if exists "RMS admins only inventory gate" on public.inventory_items;
drop policy if exists "RMS admins only recipe gate" on public.menu_item_ingredients;
create policy "RMS admins manage inventory" on public.inventory_items
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "RMS admins manage recipes" on public.menu_item_ingredients
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "RMS admins only inventory gate" on public.inventory_items
  as restrictive for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "RMS admins only recipe gate" on public.menu_item_ingredients
  as restrictive for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

alter table public.suppliers enable row level security;
alter table public.stock_movements enable row level security;
drop policy if exists "RMS admins manage suppliers" on public.suppliers;
drop policy if exists "RMS admins only supplier gate" on public.suppliers;
drop policy if exists "RMS admins view stock movements" on public.stock_movements;
drop policy if exists "RMS admins only stock history gate" on public.stock_movements;
create policy "RMS admins manage suppliers" on public.suppliers
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "RMS admins only supplier gate" on public.suppliers
  as restrictive for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "RMS admins view stock movements" on public.stock_movements
  for select to authenticated using ((select public.is_admin()));
create policy "RMS admins only stock history gate" on public.stock_movements
  as restrictive for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

revoke all on public.inventory_items, public.menu_item_ingredients, public.suppliers, public.stock_movements from public, anon, authenticated;
grant select on public.inventory_items to authenticated;
grant insert (name, unit, minimum_level, reorder_level) on public.inventory_items to authenticated;
grant update (name, unit, minimum_level, reorder_level) on public.inventory_items to authenticated;
grant select, insert, update, delete on public.menu_item_ingredients to authenticated;
grant select, insert, update, delete on public.suppliers to authenticated;
grant select on public.stock_movements to authenticated;

-- A recipe must use exactly the unit used by its inventory ingredient.
create or replace function public.validate_menu_recipe_unit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  ingredient_unit text;
begin
  select inventory.unit into ingredient_unit
  from public.inventory_items inventory where inventory.id = new.inventory_item_id;
  if not found then
    raise exception 'The selected inventory ingredient no longer exists.' using errcode = '23503';
  end if;
  if new.unit is distinct from ingredient_unit then
    raise exception 'Recipe unit (%) must match the ingredient inventory unit (%).', new.unit, ingredient_unit using errcode = '22023';
  end if;
  return new;
end;
$$;
drop trigger if exists menu_item_ingredients_validate_unit on public.menu_item_ingredients;
create trigger menu_item_ingredients_validate_unit
  before insert or update of inventory_item_id, unit on public.menu_item_ingredients
  for each row execute procedure public.validate_menu_recipe_unit();
revoke all on function public.validate_menu_recipe_unit() from public, anon, authenticated;

create or replace function public.prevent_used_inventory_unit_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.unit is distinct from old.unit and exists (
    select 1 from public.menu_item_ingredients recipe
    where recipe.inventory_item_id = old.id and recipe.unit is distinct from new.unit
  ) then
    raise exception 'This unit is used by a recipe. Update the recipe conversion before changing the inventory unit.' using errcode = '22023';
  end if;
  return new;
end;
$$;
drop trigger if exists inventory_items_protect_recipe_unit on public.inventory_items;
create trigger inventory_items_protect_recipe_unit
  before update of unit on public.inventory_items
  for each row execute procedure public.prevent_used_inventory_unit_change();
revoke all on function public.prevent_used_inventory_unit_change() from public, anon, authenticated;

create or replace function public.add_inventory_stock(
  p_inventory_item_id uuid,
  p_quantity numeric,
  p_reason text,
  p_supplier_id uuid default null,
  p_notes text default null,
  p_movement_type text default 'STOCK_IN'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_item public.inventory_items%rowtype;
  next_quantity numeric(12,3);
  movement_id uuid;
begin
  if not coalesce((select public.is_admin()), false) then
    raise exception 'Only an active administrator can add stock.' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity <= 0 or p_quantity > 999999999.999 then
    raise exception 'Enter a stock quantity greater than zero.' using errcode = '22023';
  end if;
  if nullif(btrim(p_reason), '') is null or length(btrim(p_reason)) > 120 then
    raise exception 'A reason of up to 120 characters is required.' using errcode = '22023';
  end if;
  if p_notes is not null and length(p_notes) > 2000 then
    raise exception 'Notes may contain up to 2,000 characters.' using errcode = '22023';
  end if;
  if p_movement_type not in ('STOCK_IN', 'RETURN') then
    raise exception 'Stock additions must be STOCK_IN or RETURN movements.' using errcode = '22023';
  end if;
  select * into current_item from public.inventory_items where id = p_inventory_item_id for update;
  if not found then raise exception 'The inventory ingredient was not found.' using errcode = 'P0002'; end if;
  if p_supplier_id is not null and not exists (
    select 1 from public.suppliers where id = p_supplier_id and is_active
  ) then
    raise exception 'Choose an active supplier or clear the supplier field.' using errcode = '22023';
  end if;
  next_quantity := current_item.quantity_on_hand + p_quantity;
  if next_quantity > 999999999.999 then raise exception 'The new stock count is too large.' using errcode = '22023'; end if;
  update public.inventory_items set quantity_on_hand = next_quantity, updated_at = clock_timestamp() where id = current_item.id;
  insert into public.stock_movements (
    ingredient_id, movement_type, quantity, previous_quantity, new_quantity, unit,
    reason, supplier_id, notes, performed_by
  ) values (
    current_item.id, p_movement_type, p_quantity, current_item.quantity_on_hand, next_quantity, current_item.unit,
    btrim(p_reason), p_supplier_id, nullif(btrim(p_notes), ''), (select auth.uid())
  ) returning id into movement_id;
  return movement_id;
end;
$$;

create or replace function public.adjust_inventory_stock(
  p_inventory_item_id uuid,
  p_new_quantity numeric,
  p_reason text default 'Physical Count',
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_item public.inventory_items%rowtype;
  difference numeric(12,3);
  movement_id uuid;
begin
  if not coalesce((select public.is_admin()), false) then
    raise exception 'Only an active administrator can adjust stock.' using errcode = '42501';
  end if;
  if p_new_quantity is null or p_new_quantity < 0 or p_new_quantity > 999999999.999 then
    raise exception 'Enter a valid physical count of zero or more.' using errcode = '22023';
  end if;
  if nullif(btrim(p_reason), '') is null or length(btrim(p_reason)) > 120 then
    raise exception 'A reason of up to 120 characters is required.' using errcode = '22023';
  end if;
  if p_notes is not null and length(p_notes) > 2000 then
    raise exception 'Notes may contain up to 2,000 characters.' using errcode = '22023';
  end if;
  select * into current_item from public.inventory_items where id = p_inventory_item_id for update;
  if not found then raise exception 'The inventory ingredient was not found.' using errcode = 'P0002'; end if;
  difference := p_new_quantity - current_item.quantity_on_hand;
  if difference = 0 then raise exception 'The physical count matches the current stock; no adjustment was needed.' using errcode = '22023'; end if;
  update public.inventory_items set quantity_on_hand = p_new_quantity, updated_at = clock_timestamp() where id = current_item.id;
  insert into public.stock_movements (
    ingredient_id, movement_type, quantity, previous_quantity, new_quantity, unit,
    reason, notes, performed_by
  ) values (
    current_item.id, 'ADJUSTMENT', abs(difference), current_item.quantity_on_hand, p_new_quantity, current_item.unit,
    btrim(p_reason), nullif(btrim(p_notes), ''), (select auth.uid())
  ) returning id into movement_id;
  return movement_id;
end;
$$;

create or replace function public.record_inventory_waste(
  p_inventory_item_id uuid,
  p_quantity numeric,
  p_reason text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_item public.inventory_items%rowtype;
  next_quantity numeric(12,3);
  movement_id uuid;
begin
  if not coalesce((select public.is_admin()), false) then
    raise exception 'Only an active administrator can record waste.' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity <= 0 or p_quantity > 999999999.999 then
    raise exception 'Enter a waste quantity greater than zero.' using errcode = '22023';
  end if;
  if nullif(btrim(p_reason), '') is null or length(btrim(p_reason)) > 120 then
    raise exception 'A waste reason of up to 120 characters is required.' using errcode = '22023';
  end if;
  if p_notes is not null and length(p_notes) > 2000 then
    raise exception 'Notes may contain up to 2,000 characters.' using errcode = '22023';
  end if;
  select * into current_item from public.inventory_items where id = p_inventory_item_id for update;
  if not found then raise exception 'The inventory ingredient was not found.' using errcode = 'P0002'; end if;
  if p_quantity > current_item.quantity_on_hand then
    raise exception 'Waste cannot exceed the current stock of % %.', current_item.quantity_on_hand, current_item.unit using errcode = '22023';
  end if;
  next_quantity := current_item.quantity_on_hand - p_quantity;
  update public.inventory_items set quantity_on_hand = next_quantity, updated_at = clock_timestamp() where id = current_item.id;
  insert into public.stock_movements (
    ingredient_id, movement_type, quantity, previous_quantity, new_quantity, unit,
    reason, notes, performed_by
  ) values (
    current_item.id, 'WASTE', p_quantity, current_item.quantity_on_hand, next_quantity, current_item.unit,
    btrim(p_reason), nullif(btrim(p_notes), ''), (select auth.uid())
  ) returning id into movement_id;
  return movement_id;
end;
$$;

revoke all on function public.add_inventory_stock(uuid, numeric, text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.adjust_inventory_stock(uuid, numeric, text, text) from public, anon, authenticated;
revoke all on function public.record_inventory_waste(uuid, numeric, text, text) from public, anon, authenticated;
grant execute on function public.add_inventory_stock(uuid, numeric, text, uuid, text, text) to authenticated;
grant execute on function public.adjust_inventory_stock(uuid, numeric, text, text) to authenticated;
grant execute on function public.record_inventory_waste(uuid, numeric, text, text) to authenticated;

-- A transition into PREPARING is the consumption point. The trigger locks and
-- checks every ingredient, then writes all stock-outs in the same transaction
-- as the status update. Missing recipes or insufficient stock reject the whole transition.
create or replace function public.deduct_recipe_inventory_on_preparing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  missing_items text;
  requirement record;
  current_item public.inventory_items%rowtype;
  next_quantity numeric(12,3);
begin
  if old.status <> 'PENDING'::public.order_status or new.status <> 'PREPARING'::public.order_status then
    return new;
  end if;
  if old.ingredients_deducted or new.ingredients_deducted then
    new.ingredients_deducted := true;
    new.ingredients_deducted_at := coalesce(old.ingredients_deducted_at, new.ingredients_deducted_at, clock_timestamp());
    return new;
  end if;
  if not exists (select 1 from public.order_items where order_id = new.id) then
    raise exception 'An empty order cannot enter preparation.' using errcode = '22023';
  end if;
  select string_agg(unconfigured.item_name, ', ' order by unconfigured.item_name)
  into missing_items
  from (
    select distinct order_item.item_name
    from public.order_items order_item
    where order_item.order_id = new.id
      and (order_item.menu_item_id is null or not exists (
        select 1 from public.menu_item_ingredients recipe where recipe.menu_item_id = order_item.menu_item_id
      ))
  ) unconfigured;
  if missing_items is not null then
    raise exception 'Add recipe ingredients for these menu items before starting preparation: %', missing_items using errcode = '23514';
  end if;

  for requirement in
    select recipe.inventory_item_id as ingredient_id,
      sum(recipe.quantity_per_serving * order_item.quantity)::numeric(12,3) as required_quantity,
      min(recipe.unit) as recipe_unit
    from public.order_items order_item
    join public.menu_item_ingredients recipe on recipe.menu_item_id = order_item.menu_item_id
    where order_item.order_id = new.id
    group by recipe.inventory_item_id
    order by recipe.inventory_item_id
  loop
    select * into current_item
    from public.inventory_items
    where id = requirement.ingredient_id
    for update;
    if not found then
      raise exception 'An ingredient linked to this order no longer exists.' using errcode = '23503';
    end if;
    if current_item.unit is distinct from requirement.recipe_unit then
      raise exception 'The recipe unit for % no longer matches its inventory unit.', current_item.name using errcode = '22023';
    end if;
    if current_item.quantity_on_hand < requirement.required_quantity then
      raise exception 'Not enough % to prepare this order. Required: % %; on hand: % %.',
        current_item.name, requirement.required_quantity, current_item.unit, current_item.quantity_on_hand, current_item.unit using errcode = '23514';
    end if;
    next_quantity := current_item.quantity_on_hand - requirement.required_quantity;
    update public.inventory_items
    set quantity_on_hand = next_quantity, updated_at = clock_timestamp()
    where id = current_item.id;
    insert into public.stock_movements (
      ingredient_id, movement_type, quantity, previous_quantity, new_quantity, unit,
      reason, order_id, notes, performed_by
    ) values (
      current_item.id, 'STOCK_OUT', requirement.required_quantity,
      current_item.quantity_on_hand, next_quantity, current_item.unit,
      'Order #' || new.order_number::text, new.id,
      'Recipe-based ingredient use when order entered preparation.', (select auth.uid())
    );
  end loop;

  new.ingredients_deducted := true;
  new.ingredients_deducted_at := clock_timestamp();
  return new;
end;
$$;
drop trigger if exists orders_deduct_recipe_inventory on public.orders;
create trigger orders_deduct_recipe_inventory
  before update of status on public.orders
  for each row execute procedure public.deduct_recipe_inventory_on_preparing();
revoke all on function public.deduct_recipe_inventory_on_preparing() from public, anon, authenticated;

-- The flag is database-owned: a browser can change workflow status, never the
-- idempotency state. Existing app writes only status and cancel_reason.
revoke update on public.orders from public, anon, authenticated;
grant update (status, cancel_reason) on public.orders to authenticated;

-- Inventory/status changes are published for Admin dashboards and stock screens.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'stock_movements') then
      alter publication supabase_realtime add table public.stock_movements;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'suppliers') then
      alter publication supabase_realtime add table public.suppliers;
    end if;
  end if;
end;
$$;
