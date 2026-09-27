# Connect HBA Kitchen to Supabase

## 1. Create the project configuration

Copy `.env.example` to `.env.local` and set the project URL and publishable key from the Supabase project **Connect** dialog. Do not put a `service_role` or secret key in a `NEXT_PUBLIC_` variable or browser code.

## 2. Create or update the database

Open the Supabase SQL Editor and run `supabase/schema.sql` against a fresh project. It creates profiles, menu items, orders, order items, and activity logs, including row-level security, server-side order creation, unique menu records, field limits, and audit triggers. It intentionally inserts no sample restaurant data.

If the original schema is already installed, do not run `schema.sql` again. First run `supabase/data-quality-checks.sql`, fix any rows returned, then run `supabase/quality-controls.sql`. The checks help find duplicate dishes, duplicate profile emails, invalid values, mismatched order totals, and repeated order lines. Back up the database before changing existing production data.

For the inventory ledger, run `restaurant-operations.sql`, then `menu-stock.sql`, then `inventory-stock-system.sql`, then `seed-menu.sql`. The operations script also configures the customer-readable `menu-images` bucket, limits uploads to 5 MB JPG/PNG/WEBP files, and restricts image writes/deletes and `image_url` changes to active admins. Re-run it on an existing project to apply the current Storage policies and image-column guard. The inventory migration checks for the expected existing tables and fails with a review message if a same-named supplier or stock movement table has an incompatible structure. It never drops or resets existing stock, orders, menu rows, or users.

## 3. Create the first administrator

Use the app's registration page to create an account, then confirm its email. New public sign-ups are always assigned the `CUSTOMER` role. Promote the intended administrator from the SQL Editor after confirming the account email:

```sql
update public.profiles
set role = 'ADMIN'
where email = 'admin@example.com';
```

Only promote a trusted account. The app checks both the verified Supabase session and the active `ADMIN`/`STAFF` profile before allowing RMS routes.

## 4. Configure Auth URLs and Google sign-in

In Supabase **Authentication → URL Configuration**, set the local site URL to `http://localhost:3000` during development and add the deployed site URL when deploying. Add `http://localhost:3000/auth/callback` and your deployed `/auth/callback` URL to the redirect allow list. Enable email confirmation and configure the confirmation and recovery email templates to return through the app callback.

To enable Google sign-in, open **Authentication → Sign In / Providers → Google**, enable the provider, and enter the Google OAuth Client ID and Client Secret there. In Google Cloud, set the authorized redirect URI to the Supabase Auth callback URL shown in Supabase (usually `https://<project-ref>.supabase.co/auth/v1/callback`). Add the app's `/auth/callback` URLs to the Supabase redirect allow list. The app sends users back through `/auth/callback` after OAuth. Supabase can link a Google identity to an existing account when the verified email matches; its existing profile and role remain. New Google registrations create a `CUSTOMER` profile and use the Google account name when available.

Restart the Next.js dev server after editing `.env.local`.

## Data model notes

- Menu photos use the existing `menu_items.image_url` column. Admins choose a photo in Menu Management; the app previews it locally, uploads it to the `menu-images` bucket on save, and stores the unique object path. Customers read the public image URL, while Storage mutations and database image-path changes are restricted to active admins.
- Orders store item snapshots so old receipts keep their item name and unit price if the menu changes.
- Public registrations become customer profiles. Staff account creation must be performed by a trusted admin-only server function using a server-side secret; the secret key is deliberately not part of this client setup.
- The SQL policies protect menu, order, profile, and activity rows. `inventory-stock-system.sql` restricts raw inventory, recipe links, suppliers, dashboard ingredient totals, and stock history to active administrators. Staff can change order workflow; the database consumes recipe ingredients as an order enters `PREPARING`.
- Customer checkout uses `create_customer_order`, which writes the order and line items in one database transaction. A checkout key prevents duplicate orders when a client retries after a lost response. Prices and totals are read and calculated by the database.
- Prepared menu stock is stored in `menu_items.stock_quantity` (servings), separate from ingredient inventory. Run `menu-stock.sql` before `seed-menu.sql`; menu quantities begin at zero until staff enters a verified count. Supabase reserves servings when order lines are created and restores them when an order is cancelled. Customers see current serving counts on the storefront.
- The contact page writes to `contact_messages`; the checked-in schema has no existing contact/message table. Run `contact-messages.sql` once to create the table, allow guest or own-account inserts, and restrict reads to active staff/admins. The customer form does not select or expose stored messages.
- Menu names are unique within a category after trimming/case normalization. Name, description, price, quantity, and order field limits are enforced in both the app and database.
- `inventory_items` stores raw physical quantities in each ingredient's unit. `menu_item_ingredients` maps one menu serving to ingredient amounts. `stock_movements` records stock-in, adjustment, waste, and recipe-based stock-out changes with previous/new balances, authenticated actor, optional supplier, and optional order.
- Existing positive balances are captured once as a dated opening snapshot when the ledger migration runs; that entry is clearly marked as a migration snapshot, not a historical delivery. `inventory-test-stock.sql` is an optional prototype-only sample-count script and should not be run against a live restaurant count.
- Initial recipe values in `seed-menu.sql` are setup examples that must be confirmed against actual kitchen recipes. Orders cannot enter `PREPARING` until every ordered menu item has at least one recipe link and all required ingredients are in stock. The transition, deductions, and stock-out movements run atomically; a per-order/ingredient unique index and database-owned order flag prevent duplicate deductions.
- Activity records are written for menu changes, order creation/status changes, and user access changes. Customer contact submissions are stored by `contact-messages.sql`; internal team messaging, ratings, and staff-performance data are not in the current schema.
