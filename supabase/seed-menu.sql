-- Safe, repeatable starter records for the current schema in schema.sql.
-- Existing matching menu items, serving counts, inventory counts, and recipe links are never overwritten.
-- Inventory starts at zero until an authorized staff member enters a verified physical count.
-- Menu serving counts also start at zero until staff enters the actual prepared portions available to sell.
-- Menu image files are not stored in SQL. Upload each file to Storage bucket `menu-images`
-- using the object path shown below; the app builds the public URL from image_url.

do $$
begin
  if to_regclass('public.menu_items') is null or to_regclass('public.inventory_items') is null or to_regclass('public.menu_item_ingredients') is null then
    raise exception 'Run schema.sql, quality-controls.sql, restaurant-operations.sql, and menu-stock.sql before seed-menu.sql.';
  end if;
  if exists (
    select required.column_name
    from (values ('id'), ('name'), ('category'), ('description'), ('price'), ('availability'), ('image_url'), ('stock_quantity')) as required(column_name)
    where not exists (select 1 from information_schema.columns c where c.table_schema = 'public' and c.table_name = 'menu_items' and c.column_name = required.column_name)
  ) then
    raise exception 'The existing public.menu_items table does not match this seed script. Review its columns before inserting.';
  end if;
  if not exists (
    select 1 from pg_type t join pg_enum e on e.enumtypid = t.oid
    where t.typnamespace = 'public'::regnamespace and t.typname = 'menu_availability' and e.enumlabel = 'Available'
  ) then
    raise exception 'The menu_availability enum is missing the Available value used by this seed. Review its existing values before inserting.';
  end if;
end;
$$;

with seed(name, category, description, price, image_path) as (
  values
    ('Steamed Rice', 'Rice', 'Freshly steamed white rice.', 25.00, 'steamed-rice.jpg'),
    ('Garlic Rice', 'Rice', 'Fragrant rice toasted with garlic.', 45.00, 'garlic-rice.jpg'),
    ('Java Rice', 'Rice', 'Savory yellow Java-style rice.', 45.00, 'java-rice.jpg'),
    ('Fried Rice', 'Rice', 'Wok-fried rice with egg and vegetables.', 55.00, 'fried-rice.jpg'),
    ('Chicken Adobo', 'Chicken', 'Chicken braised with soy sauce, vinegar, garlic, and bay leaf.', 185.00, 'chicken-adobo.jpg'),
    ('Chicken Inasal', 'Chicken', 'Grilled chicken marinated with calamansi, garlic, and annatto.', 195.00, 'chicken-inasal.jpg'),
    ('Chicken BBQ', 'Chicken', 'Filipino-style grilled chicken barbecue.', 180.00, 'chicken-bbq.jpg'),
    ('Tinolang Manok', 'Chicken', 'Ginger chicken soup with green papaya and leafy greens.', 195.00, 'tinolang-manok.jpg'),
    ('Pork Adobo', 'Pork', 'Pork simmered in soy sauce, vinegar, garlic, and bay leaf.', 195.00, 'pork-adobo.jpg'),
    ('Pork Sisig', 'Pork', 'Sizzling chopped pork with onion and calamansi.', 225.00, 'pork-sisig.jpg'),
    ('Lechon Kawali', 'Pork', 'Crisp fried pork belly served with dipping sauce.', 255.00, 'lechon-kawali.jpg'),
    ('Crispy Pata', 'Pork', 'Crispy pork leg for sharing, served with dipping sauce.', 795.00, 'crispy-pata.jpg'),
    ('Pork BBQ', 'Pork', 'Grilled skewers of sweet-savory pork barbecue.', 150.00, 'pork-bbq.jpg'),
    ('Beef Tapa', 'Beef', 'Marinated beef tapa, ready for a silog meal.', 215.00, 'beef-tapa.jpg'),
    ('Beef Caldereta', 'Beef', 'Slow-cooked beef stew with tomato, potato, and carrots.', 265.00, 'beef-caldereta.jpg'),
    ('Beef Kare-Kare', 'Beef', 'Beef and vegetables in a rich peanut sauce, with bagoong on the side.', 285.00, 'beef-kare-kare.jpg'),
    ('Bistek Tagalog', 'Beef', 'Beef steak with soy-calamansi sauce and onions.', 240.00, 'bistek-tagalog.jpg'),
    ('Grilled Bangus', 'Seafood', 'Grilled milkfish served with calamansi.', 220.00, 'grilled-bangus.jpg'),
    ('Sinigang na Hipon', 'Seafood', 'Shrimp in a tangy tamarind broth with vegetables.', 265.00, 'sinigang-na-hipon.jpg'),
    ('Paksiw na Bangus', 'Seafood', 'Milkfish simmered in vinegar, garlic, and ginger.', 205.00, 'paksiw-na-bangus.jpg'),
    ('Sinigang na Baboy', 'Soups', 'Pork and vegetables in a tamarind broth.', 225.00, 'sinigang-na-baboy.jpg'),
    ('Bulalo', 'Soups', 'Beef shank soup with corn and vegetables.', 325.00, 'bulalo.jpg'),
    ('Atchara', 'Sides', 'Sweet-sour pickled papaya.', 35.00, 'atchara.jpg'),
    ('Fried Egg', 'Sides', 'One freshly fried egg.', 25.00, 'fried-egg.jpg'),
    ('French Fries', 'Sides', 'Crispy salted potato fries.', 85.00, 'french-fries.jpg'),
    ('Lumpiang Shanghai', 'Sides', 'Crispy pork spring rolls with dipping sauce.', 105.00, 'lumpiang-shanghai.jpg'),
    ('Halo-Halo', 'Desserts', 'Shaved ice with sweet beans, fruit, leche flan, and milk.', 135.00, 'halo-halo.jpg'),
    ('Leche Flan', 'Desserts', 'Silky caramel custard.', 95.00, 'leche-flan.jpg'),
    ('Turon', 'Desserts', 'Crisp banana and jackfruit rolls with caramel.', 60.00, 'turon.jpg'),
    ('Bottled Water', 'Drinks', 'Chilled bottled drinking water.', 25.00, 'bottled-water.jpg'),
    ('Soft Drink', 'Drinks', 'Chilled canned soft drink.', 45.00, 'soft-drink.jpg'),
    ('Iced Tea', 'Drinks', 'House-style iced tea served chilled.', 55.00, 'iced-tea.jpg'),
    ('Calamansi Juice', 'Drinks', 'Fresh-tasting calamansi juice.', 65.00, 'calamansi-juice.jpg')
)
insert into public.menu_items (name, category, description, price, availability, image_url, stock_quantity)
select s.name, s.category, s.description, s.price, 'Available'::public.menu_availability, s.image_path, 0
from seed s
where not exists (
  select 1 from public.menu_items existing
  where lower(regexp_replace(btrim(existing.name), '[[:space:]]+', ' ', 'g')) = lower(regexp_replace(btrim(s.name), '[[:space:]]+', ' ', 'g'))
    and lower(regexp_replace(btrim(existing.category), '[[:space:]]+', ' ', 'g')) = lower(regexp_replace(btrim(s.category), '[[:space:]]+', ' ', 'g'))
)
on conflict do nothing;

insert into public.inventory_items (name, unit, quantity_on_hand, minimum_level, reorder_level)
values
  ('Rice', 'kg', 0, 5, 10), ('Chicken', 'kg', 0, 3, 8), ('Pork', 'kg', 0, 3, 8), ('Beef', 'kg', 0, 2, 6),
  ('Bangus', 'pieces', 0, 5, 12), ('Shrimp', 'kg', 0, 2, 5), ('Eggs', 'pieces', 0, 24, 60),
  ('Garlic', 'kg', 0, 0.5, 1.5), ('Onion', 'kg', 0, 1, 3), ('Tomato', 'kg', 0, 1, 3), ('Ginger', 'kg', 0, 0.5, 1.5),
  ('Soy Sauce', 'liters', 0, 1, 3), ('Vinegar', 'liters', 0, 1, 3), ('Fish Sauce', 'liters', 0, 0.5, 2), ('Cooking Oil', 'liters', 0, 2, 6),
  ('Tamarind Mix', 'kg', 0, 0.5, 2), ('Calamansi', 'kg', 0, 1, 3), ('Chili', 'kg', 0, 0.25, 1),
  ('Potatoes', 'kg', 0, 2, 5), ('Carrots', 'kg', 0, 1, 3), ('Peanuts', 'kg', 0, 0.5, 2), ('Sugar', 'kg', 0, 1, 3),
  ('Salt', 'kg', 0, 0.5, 2), ('Ice', 'kg', 0, 5, 15), ('Bottled Water', 'pieces', 0, 12, 36),
  ('Soft Drinks', 'cans', 0, 24, 72), ('Bananas', 'kg', 0, 2, 5), ('Papaya', 'pieces', 0, 2, 5), ('Coconut Milk', 'liters', 0, 1, 3)
on conflict do nothing;

with recipe(menu_name, menu_category, ingredient, amount, unit) as (
  values
    ('Steamed Rice','Rice','Rice',0.15,'kg'),
    ('Chicken Adobo','Chicken','Chicken',0.18,'kg'), ('Chicken Adobo','Chicken','Garlic',0.01,'kg'), ('Chicken Adobo','Chicken','Soy Sauce',0.02,'liters'), ('Chicken Adobo','Chicken','Vinegar',0.02,'liters'),
    ('Chicken Inasal','Chicken','Chicken',0.2,'kg'), ('Chicken Inasal','Chicken','Calamansi',0.02,'kg'), ('Chicken Inasal','Chicken','Garlic',0.01,'kg'), ('Chicken Inasal','Chicken','Cooking Oil',0.015,'liters'),
    ('Pork Adobo','Pork','Pork',0.18,'kg'), ('Pork Adobo','Pork','Garlic',0.01,'kg'), ('Pork Adobo','Pork','Soy Sauce',0.02,'liters'), ('Pork Adobo','Pork','Vinegar',0.02,'liters'),
    ('Pork Sisig','Pork','Pork',0.18,'kg'), ('Pork Sisig','Pork','Onion',0.03,'kg'), ('Pork Sisig','Pork','Calamansi',0.015,'kg'),
    ('Lechon Kawali','Pork','Pork',0.25,'kg'), ('Lechon Kawali','Pork','Cooking Oil',0.05,'liters'),
    ('Beef Tapa','Beef','Beef',0.18,'kg'), ('Beef Tapa','Beef','Garlic',0.01,'kg'), ('Beef Tapa','Beef','Soy Sauce',0.015,'liters'),
    ('Beef Caldereta','Beef','Beef',0.2,'kg'), ('Beef Caldereta','Beef','Tomato',0.05,'kg'), ('Beef Caldereta','Beef','Potatoes',0.06,'kg'), ('Beef Caldereta','Beef','Carrots',0.04,'kg'),
    ('Beef Kare-Kare','Beef','Beef',0.2,'kg'), ('Beef Kare-Kare','Beef','Peanuts',0.025,'kg'), ('Beef Kare-Kare','Beef','Onion',0.02,'kg'),
    ('Grilled Bangus','Seafood','Bangus',1,'pieces'), ('Sinigang na Hipon','Seafood','Shrimp',0.16,'kg'), ('Sinigang na Hipon','Seafood','Tamarind Mix',0.02,'kg'),
    ('Sinigang na Baboy','Soups','Pork',0.16,'kg'), ('Sinigang na Baboy','Soups','Tamarind Mix',0.02,'kg'), ('Bulalo','Soups','Beef',0.25,'kg'),
    ('Fried Egg','Sides','Eggs',1,'pieces'), ('Halo-Halo','Desserts','Ice',0.25,'kg'), ('Turon','Desserts','Bananas',0.12,'kg'),
    ('Bottled Water','Drinks','Bottled Water',1,'pieces'), ('Soft Drink','Drinks','Soft Drinks',1,'cans')
)
insert into public.menu_item_ingredients (menu_item_id, inventory_item_id, quantity_per_serving, unit)
select menu.id, stock.id, recipe.amount, recipe.unit
from recipe
join public.menu_items menu on menu.name = recipe.menu_name and menu.category = recipe.menu_category
join public.inventory_items stock on stock.name = recipe.ingredient
on conflict (menu_item_id, inventory_item_id) do nothing;
