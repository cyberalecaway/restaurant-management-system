-- Read-only checks for bad, duplicate, or incomplete rows before applying quality-controls.sql.
-- Each result set contains only problems. An empty result set is clean.

select lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')) as normalized_name,
       lower(regexp_replace(btrim(category), '[[:space:]]+', ' ', 'g')) as normalized_category,
       count(*) as duplicate_count,
       array_agg(id order by created_at) as menu_item_ids
from public.menu_items
group by 1, 2
having count(*) > 1;

select lower(btrim(email)) as normalized_email,
       count(*) as duplicate_count,
       array_agg(id) as profile_ids
from public.profiles
group by 1
having count(*) > 1;

select id, name, category, price, length(description) as description_length
from public.menu_items
where length(btrim(name)) not between 1 and 120
   or length(btrim(category)) not between 1 and 60
   or length(description) > 1000
   or price <= 0
   or price > 100000;

select id, full_name, email, mobile
from public.profiles
where length(btrim(full_name)) > 120
   or length(btrim(email)) not between 3 and 254
   or (mobile is not null and length(btrim(mobile)) > 20);

select id, customer_name, customer_email, table_label, length(notes) as notes_length
from public.orders
where length(btrim(customer_name)) not between 1 and 120
   or (customer_email is not null and length(btrim(customer_email)) > 254)
   or length(btrim(table_label)) not between 1 and 80
   or (notes is not null and length(notes) > 1000)
   or (cancel_reason is not null and length(cancel_reason) > 500);

select id, order_id, menu_item_id, quantity, unit_price
from public.order_items
where quantity not between 1 and 99
   or unit_price <= 0
   or unit_price > 100000;

select o.id, o.order_number, o.subtotal as recorded_subtotal,
       coalesce(sum(i.line_total), 0) as calculated_subtotal
from public.orders o
left join public.order_items i on i.order_id = o.id
group by o.id
having o.subtotal <> coalesce(sum(i.line_total), 0);

select order_id, menu_item_id, count(*) as duplicate_lines, array_agg(id) as line_ids
from public.order_items
where menu_item_id is not null
group by order_id, menu_item_id
having count(*) > 1;
