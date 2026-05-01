-- ============================================================
-- Migration: 020_add_pre_order_to_products
-- Description: Adds pre-order support to products table.
--   is_pre_order       — fast boolean flag for filtering/indexing
--   pre_order_config   — JSONB for flexible config (no future
--                        migrations needed for new attributes)
--
-- pre_order_config shape:
--   {
--     "estimate":       "2–3 tuần",          -- human-readable shipping estimate
--     "available_date": "2026-07-01",         -- ISO date when stock arrives (optional)
--     "notes":          "Sản phẩm đặt trước"  -- optional display note
--   }
-- ============================================================

-- ─── 1. Add columns ──────────────────────────────────────────

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_pre_order       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pre_order_config   JSONB;

-- ─── 2. Constraint: config required when is_pre_order = true ─

ALTER TABLE public.products
  ADD CONSTRAINT products_pre_order_config_check
  CHECK (
    is_pre_order = false
    OR (is_pre_order = true AND pre_order_config IS NOT NULL)
  );

-- ─── 3. Index for fast pre-order product queries ─────────────

CREATE INDEX IF NOT EXISTS idx_products_is_pre_order
  ON public.products(is_pre_order)
  WHERE is_pre_order = true;
