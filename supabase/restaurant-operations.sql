-- HBA Kitchen operational extensions. Run after schema.sql and quality-controls.sql.
-- This migration is additive and safe to rerun; it does not change existing users or orders.

do $$
begin
  if to_regclass('public.menu_items') is null or to_regclass('public.profiles') is null then
    raise exception 'Install supabase/schema.sql before restaurant-operations.sql.';
  end if;
  if exists (
    select required.column_name
    from (values ('id'), ('name'), ('category'), ('description'), ('price'), ('availability'), ('image_url')) as required(column_name)
    where not exists (select 1 from information_schema.columns c where c.table_schema = 'public' and c.table_name = 'menu_items' and c.column_name = required.column_name)
  ) then
    raise exception 'public.menu_items is missing a column required by the HBA menu and photo flow. Review the installed schema before continuing.';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'id') then
    raise exception 'public.profiles does not match the HBA auth profile schema.';
  end if;
  if to_regprocedure('public.is_staff_or_admin()') is null then
    raise exception 'Install supabase/quality-controls.sql before restaurant-operations.sql.';
  end if;
end;
$$;

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(btrim(name)) between 1 and 120),
  unit text not null check (length(btrim(unit)) between 1 and 24),
  quantity_on_hand numeric(12,3) not null default 0 check (quantity_on_hand >= 0),
  minimum_level numeric(12,3) not null default 0 check (minimum_level >= 0),
  reorder_level numeric(12,3) not null default 0 check (reorder_level >= minimum_level),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_item_ingredients (
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  quantity_per_serving numeric(12,3) not null check (quantity_per_serving > 0),
  unit text not null check (length(btrim(unit)) between 1 and 24),
  primary key (menu_item_id, inventory_item_id)
);

create unique index if not exists inventory_items_name_normalized_idx
  on public.inventory_items (lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')));

alter table public.inventory_items enable row level security;
alter table public.menu_item_ingredients enable row level security;
revoke all on public.inventory_items, public.menu_item_ingredients from anon, authenticated;
grant select, insert, update, delete on public.inventory_items, public.menu_item_ingredients to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'inventory_items' and policyname = 'RMS staff manage inventory') then
    execute 'create policy "RMS staff manage inventory" on public.inventory_items for all to authenticated using ((select public.is_staff_or_admin())) with check ((select public.is_staff_or_admin()))';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_item_ingredients' and policyname = 'RMS staff manage recipes') then
    execute 'create policy "RMS staff manage recipes" on public.menu_item_ingredients for all to authenticated using ((select public.is_staff_or_admin())) with check ((select public.is_staff_or_admin()))';
  end if;
end;
$$;

-- A public bucket is required for customer menu photos. Existing buckets are left unchanged.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-images', 'menu-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'menu-images';

do $$
begin
  if not exists (select 1 from storage.buckets where id = 'menu-images' and public) then
    raise exception 'The menu-images bucket already exists as private. Review it in Supabase Storage before making menu photos public.';
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'inventory_items') then
      alter publication supabase_realtime add table public.inventory_items;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
      alter publication supabase_realtime add table public.orders;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'menu_items') then
      alter publication supabase_realtime add table public.menu_items;
    end if;
  end if;
end;
$$;

drop policy if exists "RMS staff upload menu images" on storage.objects;
drop policy if exists "RMS staff update menu images" on storage.objects;
drop policy if exists "RMS staff delete menu images" on storage.objects;
drop policy if exists "RMS admins upload menu images" on storage.objects;
drop policy if exists "RMS admins update menu images" on storage.objects;
drop policy if exists "RMS admins delete menu images" on storage.objects;
create policy "RMS admins upload menu images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'menu-images' and (select public.is_admin()));
create policy "RMS admins update menu images" on storage.objects
  for update to authenticated
  using (bucket_id = 'menu-images' and (select public.is_admin()))
  with check (bucket_id = 'menu-images' and (select public.is_admin()));
create policy "RMS admins delete menu images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'menu-images' and (select public.is_admin()));

drop policy if exists "RMS menu images admin insert gate" on storage.objects;
drop policy if exists "RMS menu images admin update gate" on storage.objects;
drop policy if exists "RMS menu images admin delete gate" on storage.objects;
create policy "RMS menu images admin insert gate" on storage.objects
  as restrictive for insert to public
  with check (bucket_id <> 'menu-images' or (select public.is_admin()));
create policy "RMS menu images admin update gate" on storage.objects
  as restrictive for update to public
  using (bucket_id <> 'menu-images' or (select public.is_admin()))
  with check (bucket_id <> 'menu-images' or (select public.is_admin()));
create policy "RMS menu images admin delete gate" on storage.objects
  as restrictive for delete to public
  using (bucket_id <> 'menu-images' or (select public.is_admin()));

create or replace function public.guard_menu_image_url_admin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') = 'authenticated'
    and not coalesce((select public.is_admin()), false) then
    if tg_op = 'INSERT' and new.image_url is not null then
      raise exception 'Only an active administrator can set a menu image.' using errcode = '42501';
    elsif tg_op = 'UPDATE' and new.image_url is distinct from old.image_url then
      raise exception 'Only an active administrator can change a menu image.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists menu_images_require_admin on public.menu_items;
create trigger menu_images_require_admin
  before insert or update of image_url on public.menu_items
  for each row execute procedure public.guard_menu_image_url_admin();
revoke all on function public.guard_menu_image_url_admin() from public, anon, authenticated;
