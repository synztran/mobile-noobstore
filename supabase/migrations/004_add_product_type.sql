-- ============================================================
-- Migration: 004_add_product_type
-- Description: Adds product_type column to products table.
--              Values: 'standard' | 'kit' | 'component'
--              Backfills existing rows based on product_components
--              relationships, then makes the column NOT NULL.
-- ============================================================

-- ─── 1. Add column (nullable first to allow backfill) ────────

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'standard';

-- ─── 2. Backfill kits (anything that is a parent in product_components) ──

UPDATE public.products
SET product_type = 'kit'
WHERE id IN (
  SELECT DISTINCT parent_product_id
  FROM public.product_components
  WHERE parent_product_id IS NOT NULL
);

-- ─── 3. Backfill components (anything used as a component) ───

UPDATE public.products
SET product_type = 'component'
WHERE id IN (
  SELECT DISTINCT component_product_id
  FROM public.product_components
  WHERE component_product_id IS NOT NULL
)
-- Don't downgrade a kit if it happens to also be a component
AND product_type = 'standard';

-- ─── 4. Add CHECK constraint and make NOT NULL ───────────────

ALTER TABLE public.products
  ALTER COLUMN product_type SET NOT NULL;

ALTER TABLE public.products
  ADD CONSTRAINT products_product_type_check
  CHECK (product_type IN ('standard', 'kit', 'component'));
