# Migration 168: Product Addons (Frequently Bought Together Deals)

## Purpose
Enables store managers to configure custom cross-sell add-on products for any main product, specifying a discount (percentage or fixed VND amount), display order, and active toggle.

## Changes
- **Tables created**: `product_addons`
  - `id`: UUID primary key.
  - `main_product_id`: TEXT foreign key to `products(id)` (CASCADE on delete).
  - `addon_product_id`: TEXT foreign key to `products(id)` (CASCADE on delete).
  - `discount_type`: text (`percentage` or `fixed_amount`).
  - `discount_value`: numeric (non-negative).
  - `is_active`: boolean (default `true`).
  - `sort_order`: integer (default `0`).
  - `created_at` / `updated_at`: timestamptz.
  - Constraints: `uq_product_addon` prevents duplicate pairings; `chk_diff_products` prevents a product pairing with itself.
- **Indexes**:
  - `idx_product_addons_main_active` on `(main_product_id, is_active, sort_order)`.
  - `idx_product_addons_addon` on `(addon_product_id)`.
- **Security & RLS**:
  - Public `SELECT` allowed where `is_active = true`.
  - Admin users with `role = 'admin'` have full CRUD access (`ALL`).
  - Service role granted full access.

## System Behavior
- **Storefront (`apps/web`)**:
  - When loading `/shop/[slug]`, the server fetches active add-ons for the main product.
  - If manual add-ons exist, they take priority; if empty, fallback to order co-occurrence / related brand products.
  - A teaser pill in the sticky purchase panel invites customers to view the deal, linking/scrolling down to the interactive combo builder.
- **Admin (`apps/admin`)**:
  - Staff can view, add, toggle, reorder, and delete add-on products for any product via `ProductAddonsModal`.

## Existing Data
- Purely additive table. Zero breaking changes or data backfill required.

## Rollback
```sql
DROP TABLE IF EXISTS product_addons CASCADE;
```
