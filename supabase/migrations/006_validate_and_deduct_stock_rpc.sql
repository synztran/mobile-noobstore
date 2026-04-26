-- ─── Migration 006: Validate & Atomically Deduct Stock RPC ──────────────────
-- Creates a PL/pgSQL function called during checkout to:
--   1. Validate every item (parent + components) has sufficient stock.
--   2. If ALL checks pass, deduct stock in a single atomic operation.
--   3. If ANY check fails, raise an exception (transaction rolls back).
--
-- Input (JSONB array):
--   [{
--     "product_id": "uuid",          -- parent product
--     "variant_id":  "uuid",         -- parent variant (may be null for kits)
--     "quantity":    2,              -- how many kits/items in cart
--     "components": [                -- only present for kit items
--       { "variant_id": "uuid", "quantity": 1 }   -- qty per kit unit
--     ]
--   }]
--
-- Returns:
--   { "success": true }
--   or raises an exception with the out-of-stock item name.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.validate_and_deduct_stock(p_items JSONB)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
AS $$
DECLARE
  item          JSONB;
  comp          JSONB;
  parent_qty    INTEGER;
  comp_qty      INTEGER;
  total_req     INTEGER;
  avail_stock   INTEGER;
  item_name     TEXT;
BEGIN
  -- ── Phase 1: Validate all stock before touching anything ──────────────────
  FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    parent_qty := (item->>'quantity')::INTEGER;

    -- Validate parent product stock
    SELECT p.stock_quantity, p.name
      INTO avail_stock, item_name
      FROM public.products p
     WHERE p.id = (item->>'product_id')::TEXT;

    IF avail_stock IS NULL THEN
      RAISE EXCEPTION 'Product not found: %', item->>'product_id';
    END IF;

    IF avail_stock < parent_qty THEN
      RAISE EXCEPTION 'Insufficient stock for "%": available %, requested %',
        item_name, avail_stock, parent_qty;
    END IF;

    -- Validate each required component variant
    FOR comp IN SELECT * FROM jsonb_array_elements(COALESCE(item->'components', '[]'::JSONB)) LOOP
      comp_qty  := COALESCE((comp->>'quantity')::INTEGER, 1);
      total_req := parent_qty * comp_qty;

      SELECT pv.stock_quantity
        INTO avail_stock
        FROM public.product_variants pv
       WHERE pv.id = (comp->>'variant_id')::TEXT;

      IF avail_stock IS NULL THEN
        RAISE EXCEPTION 'Component variant not found: %', comp->>'variant_id';
      END IF;

      IF avail_stock < total_req THEN
        -- Get a friendly name for the error message
        SELECT p.name || ' – ' || pv.variant_name
          INTO item_name
          FROM public.product_variants pv
          JOIN public.products p ON p.id = pv.product_id
         WHERE pv.id = (comp->>'variant_id')::TEXT;

        RAISE EXCEPTION 'Insufficient component stock for "%": available %, required %',
          COALESCE(item_name, comp->>'variant_id'), avail_stock, total_req;
      END IF;
    END LOOP;
  END LOOP;

  -- ── Phase 2: All checks passed — deduct stock atomically ─────────────────
  FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    parent_qty := (item->>'quantity')::INTEGER;

    -- Deduct from parent product
    UPDATE public.products
       SET stock_quantity = stock_quantity - parent_qty
     WHERE id = (item->>'product_id')::TEXT;

    -- Deduct from each component variant
    FOR comp IN SELECT * FROM jsonb_array_elements(COALESCE(item->'components', '[]'::JSONB)) LOOP
      comp_qty  := COALESCE((comp->>'quantity')::INTEGER, 1);
      total_req := parent_qty * comp_qty;

      UPDATE public.product_variants
         SET stock_quantity = stock_quantity - total_req
       WHERE id = (comp->>'variant_id')::TEXT;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execute to anon + authenticated.
-- Checkout allows guest users (user_id nullable), so anon must be able to call this.
GRANT EXECUTE ON FUNCTION public.validate_and_deduct_stock(JSONB) TO anon, authenticated;
