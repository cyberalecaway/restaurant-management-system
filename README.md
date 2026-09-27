This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Supabase roles, menu, inventory, and photos

The application uses `profiles.role` with the existing `ADMIN`, `STAFF`, and `CUSTOMER` values. New password and Google accounts are created as `CUSTOMER` by the existing auth-user trigger. The RMS routes require an active `ADMIN` or `STAFF` profile; `/users`, `/settings`, and `/inventory` are ADMIN-only, and `/my-orders` requires an active `CUSTOMER` profile. Only ADMIN sees the RMS sidebar; STAFF uses a separate compact top navigation for operational pages. The customer storefront is `/`, with sign-in and registration at `/login` and `/register`.

In the Supabase Dashboard, open **SQL Editor**. On a fresh project, run `supabase/schema.sql`, then `supabase/quality-controls.sql`, `supabase/restaurant-operations.sql`, `supabase/menu-stock.sql`, `supabase/inventory-stock-system.sql`, and `supabase/seed-menu.sql` in that order. If the original schema and quality controls are already installed, do not run them again; run the operational migrations in order:

1. Run `supabase/restaurant-operations.sql`. This adds ingredient inventory, menu-to-ingredient recipe links, staff/admin inventory policies, the `menu-images` Storage bucket and upload policies, and Realtime publication entries.
2. Run `supabase/menu-stock.sql`. It adds the per-serving count and reserves servings when orders are placed. Cancelled orders return those servings. It is safe to rerun.
3. Run `supabase/inventory-stock-system.sql`. It adds the supplier and movement ledger, Admin-only stock controls, and recipe use when an order enters preparation. It keeps current on-hand counts and existing records.
4. Run `supabase/seed-menu.sql`. It inserts Filipino dishes such as adobo and rice when they are missing. Existing dishes, inventory counts, and recipe values are left untouched.
5. Run `supabase/contact-messages.sql` to connect the customer contact form to the private staff/admin inbox. It allows guest submissions without allowing customers to read stored messages.
6. In admin **Menu Management**, enter prepared servings available for sale. In **Inventory / Stock**, use **Add Stock** to record physical raw ingredients, then confirm the recipe quantities before accepting orders into preparation.

For a development database only, `supabase/inventory-test-stock.sql` can add clearly labelled prototype opening counts to matching zero-stock ingredients. It preserves nonzero/currently audited quantities. Do not run this test-data script against a live restaurant's physical stock.

The starter menu records use Philippine peso prices and are setup/test records, not historical sales. Categories and menu entries are: Rice (Steamed Rice, Garlic Rice, Java Rice, Fried Rice); Chicken (Chicken Adobo, Chicken Inasal, Chicken BBQ, Tinolang Manok); Pork (Pork Adobo, Pork Sisig, Lechon Kawali, Crispy Pata, Pork BBQ); Beef (Beef Tapa, Beef Caldereta, Beef Kare-Kare, Bistek Tagalog); Seafood (Grilled Bangus, Sinigang na Hipon, Paksiw na Bangus); Soups (Sinigang na Baboy, Bulalo); Sides (Atchara, Fried Egg, French Fries, Lumpiang Shanghai); Desserts (Halo-Halo, Leche Flan, Turon); Drinks (Bottled Water, Soft Drink, Iced Tea, Calamansi Juice).

### Uploading menu photos

The seed stores object paths in `menu_items.image_url`; SQL does not store binary images. In **Supabase Dashboard → Storage → menu-images**, upload a JPG, PNG, or WebP photo using the exact object names in the seed, such as `chicken-adobo.jpg`, `chicken-inasal.jpg`, `pork-sisig.jpg`, `lechon-kawali.jpg`, `beef-tapa.jpg`, `grilled-bangus.jpg`, `sinigang-na-hipon.jpg`, and `halo-halo.jpg`. The other seed paths are the menu names in lowercase with spaces replaced by hyphens and a `.jpg` extension. The public menu page and RMS build the bucket URL from the existing project URL and show a photo placeholder until its file is uploaded. For a different name or file type, set the menu item's Storage image path to its exact object path after uploading.

### Inventory notes

Starter ingredient thresholds and recipe quantities are setup examples, not verified HBA kitchen measurements. On-hand quantities start at `0` because actual physical stock was not available to inspect. Open **Inventory / Stock** and enter a verified count before relying on stock status. Ingredient additions, physical-count adjustments, waste, and order consumption are recorded in `stock_movements`. Recipes are required before an order can move to **PREPARING**; its recipe quantities are deducted once at that transition. Orders already in preparation before this migration are not replayed into the ledger.

The existing policies on profiles, menu, orders, order items, and activity logs remain in place. Customers continue to read only their own order records through the existing ownership RLS policy. Inventory, recipes, suppliers, dashboard stock totals, and stock history are restricted to active `ADMIN` profiles using RLS and Admin-only routes. Staff can continue managing orders; moving an order to **PREPARING** performs the recipe deduction in the database transaction. Menu photos are intentionally public for storefront display; upload, update, and delete require an active staff/admin profile. Order, menu, and inventory screens subscribe to Supabase Postgres Changes and query the database as the source of truth.
