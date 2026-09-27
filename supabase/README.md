# Connect HBA Kitchen to Supabase

## 1. Create the project configuration

Copy `.env.example` to `.env.local` and set the project URL and publishable key from the Supabase project **Connect** dialog. Do not put a `service_role` or secret key in a `NEXT_PUBLIC_` variable or browser code.

## 2. Create or update the database

Open the Supabase SQL Editor and run `supabase/schema.sql` against a fresh project. It creates profiles, menu items, orders, order items, and activity logs, including row-level security, server-side order creation, unique menu records, field limits, and audit triggers. It intentionally inserts no sample restaurant data.

If the original schema is already installed, do not run `schema.sql` again. First run `supabase/data-quality-checks.sql`, fix any rows returned, then run `supabase/quality-controls.sql`. The checks help find duplicate dishes, duplicate profile emails, invalid values, mismatched order totals, and repeated order lines. Back up the database before changing existing production data.

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

- Menu photos use `image_url`; configure a Supabase Storage bucket and upload policy before adding managed uploads.
- Orders store item snapshots so old receipts keep their item name and unit price if the menu changes.
- Public registrations become customer profiles. Staff account creation must be performed by a trusted admin-only server function using a server-side secret; the secret key is deliberately not part of this client setup.
- The SQL policies protect menu, order, profile, and activity rows. Extend those policies alongside any new table or operation.
- Customer checkout uses `create_customer_order`, which writes the order and line items in one database transaction. A checkout key prevents duplicate orders when a client retries after a lost response. Prices and totals are read and calculated by the database.
- Menu names are unique within a category after trimming/case normalization. Name, description, price, quantity, and order field limits are enforced in both the app and database.
- Activity records are written for menu changes, order creation/status changes, and user access changes. Messaging, ratings, and staff-performance data are not in the current schema, so the app does not show fabricated values for them.
