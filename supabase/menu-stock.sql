-- Serving counts for prepared menu items. This is separate from ingredient inventory.
-- Safe to run more than once. Existing menu rows begin at zero; enter a verified count in Menu Management.

do $$
begin
  if to_regclass('public.menu_items') is null or to_regclass('public.order_items') is null or to_regclass('public.orders') is null then
    raise exception 'Run schema.sql and quality-controls.sql before menu-stock.sql.';
  end if;
end;
$$;

alter table public.menu_items add column if not exists stock_quantity integer not null default 0;
alter table public.orders add column if not exists stock_reserved boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.menu_items'::regclass and conname = 'menu_items_stock_quantity_range_check') then
    alter table public.menu_items add constraint menu_items_stock_quantity_range_check check (stock_quantity between 0 and 1000000);
  end if;
end;
$$;

create or replace function public.reserve_menu_item_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  menu_item public.menu_items%rowtype;
  parent_status public.order_status;
begin
  if new.menu_item_id is null then
    return new;
  end if;

  select orders.status into parent_status from public.orders where orders.id = new.order_id;
  if not found or parent_status = 'CANCELLED'::public.order_status then
    raise exception 'Cannot add a menu item to a missing or cancelled order';
  end if;

  select * into menu_item
  from public.menu_items
  where id = new.menu_item_id
  for update;

  if not found or menu_item.availability <> 'Available'::public.menu_availability then
    raise exception 'This menu item is not available';
  end if;
  if menu_item.stock_quantity < new.quantity then
    raise exception 'Only % servings of % are available', menu_item.stock_quantity, menu_item.name;
  end if;

  update public.menu_items
  set stock_quantity = stock_quantity - new.quantity
  where id = menu_item.id;

  update public.orders set stock_reserved = true where id = new.order_id;
  return new;
end;
$$;

drop trigger if exists order_item_reserve_stock on public.order_items;
create trigger order_item_reserve_stock
  before insert on public.order_items
  for each row execute procedure public.reserve_menu_item_stock();

create or replace function public.restore_cancelled_order_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status <> 'CANCELLED'::public.order_status
    and new.status = 'CANCELLED'::public.order_status
    and old.stock_reserved then
    update public.menu_items as menu
    set stock_quantity = menu.stock_quantity + restock.quantity
    from (
      select order_items.menu_item_id, sum(order_items.quantity)::integer as quantity
      from public.order_items
      where order_items.order_id = new.id and order_items.menu_item_id is not null
      group by order_items.menu_item_id
    ) as restock
    where menu.id = restock.menu_item_id;

    update public.orders set stock_reserved = false where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_restore_cancelled_stock on public.orders;
create trigger orders_restore_cancelled_stock
  after update of status on public.orders
  for each row execute procedure public.restore_cancelled_order_stock();
