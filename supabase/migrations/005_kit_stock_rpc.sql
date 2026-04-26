-- ─── Migration 005: Dynamic Kit Stock RPC ────────────────────────────────────
-- Adds a PostgreSQL function that calculates the effective available stock
-- for a kit product by finding the minimum stock_quantity among all variants
-- that belong to required components of that kit.
--
-- Logic:
--   1. Find all rows in product_components where parent_product_id = kit_id
--      and is_required = true.
--   2. Join to product_variants via component_product_id to get their variants.
--   3. Return MIN(stock_quantity) — the bottleneck component limits the kit.
--   4. If the kit has no required components, fall back to the kit's own
--      stock_quantity from the products table.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_kit_stock(kit_id TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (
      SELECT MIN(pv.stock_quantity)
      FROM public.product_components pc
      JOIN public.product_variants pv
        ON pv.product_id = pc.component_product_id
      WHERE pc.parent_product_id = kit_id
        AND pc.is_required = true
    ),
    -- Fallback: kit has no required components, use its own stock
    (
      SELECT stock_quantity
      FROM public.products
      WHERE id = kit_id
    )
  );
$$;

-- Grant execute to the anon and authenticated roles (used by Supabase client)
GRANT EXECUTE ON FUNCTION public.get_kit_stock(TEXT) TO anon, authenticated;
