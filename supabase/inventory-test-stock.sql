-- PROTOTYPE / DEVELOPMENT ONLY. These are the user's sample test counts, not HBA historical or verified stock.
-- Run only in a development database after inventory-stock-system.sql and seed-menu.sql.
-- Existing nonzero counts and ingredients with any movement history are preserved.
begin;

do $$
begin
  if to_regclass('public.inventory_items') is null or to_regclass('public.stock_movements') is null then
    raise exception 'Run restaurant-operations.sql and inventory-stock-system.sql before the prototype stock seed.';
  end if;
  if (
    select count(distinct seeded.name)
    from (values
      ('Rice'), ('Chicken'), ('Pork'), ('Beef'), ('Bangus'), ('Shrimp'), ('Eggs'),
      ('Garlic'), ('Onion'), ('Cooking Oil'), ('Soy Sauce'), ('Vinegar'), ('Bottled Water'), ('Soft Drinks')
    ) as seeded(name)
    join public.inventory_items ingredient on lower(btrim(ingredient.name)) = lower(seeded.name)
  ) <> 14 then
    raise exception 'Expected test ingredients were not all found. Run seed-menu.sql first; no stock was changed.';
  end if;
end;
$$;

create temporary table hba_test_stock_changes on commit drop as
select ingredient.id as inventory_item_id,
  ingredient.name,
  ingredient.unit,
  ingredient.quantity_on_hand as previous_quantity,
  sample.on_hand::numeric(12,3) as new_quantity,
  sample.minimum_level::numeric(12,3) as minimum_level,
  sample.reorder_level::numeric(12,3) as reorder_level
from (values
  ('Rice', 25, 5, 10),
  ('Chicken', 15, 5, 10),
  ('Pork', 12, 4, 8),
  ('Beef', 8, 3, 5),
  ('Bangus', 20, 5, 10),
  ('Shrimp', 5, 2, 3),
  ('Eggs', 120, 30, 60),
  ('Garlic', 3, 1, 2),
  ('Onion', 5, 2, 3),
  ('Cooking Oil', 10, 3, 5),
  ('Soy Sauce', 5, 1, 2),
  ('Vinegar', 5, 1, 2),
  ('Bottled Water', 48, 12, 24),
  ('Soft Drinks', 48, 12, 24)
) as sample(name, on_hand, minimum_level, reorder_level)
join public.inventory_items ingredient on lower(btrim(ingredient.name)) = lower(sample.name)
where ingredient.quantity_on_hand = 0
  and not exists (
    select 1 from public.stock_movements movement
    where movement.inventory_item_id = ingredient.id
  )
for update of ingredient;

update public.inventory_items ingredient
set quantity_on_hand = change.new_quantity,
    minimum_level = change.minimum_level,
    reorder_level = change.reorder_level,
    updated_at = clock_timestamp()
from hba_test_stock_changes change
where ingredient.id = change.inventory_item_id;

insert into public.stock_movements (
  inventory_item_id, movement_type, quantity, previous_quantity, new_quantity,
  unit, reason, notes, performed_by
)
select inventory_item_id, 'ADJUSTMENT', new_quantity, previous_quantity, new_quantity,
  unit, 'Initial test stock (prototype)',
  'Prototype sample count from inventory-test-stock.sql. Not a verified HBA historical count.',
  null
from hba_test_stock_changes;

commit;
