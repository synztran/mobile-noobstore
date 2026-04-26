-- Fix validate_and_deduct_stock for kit products.
-- Kits can have stock_quantity = 0 on parent product and rely on component variant stock.
-- This function now validates/deducts parent stock only for non-kit items.

CREATE OR REPLACE FUNCTION public.validate_and_deduct_stock(p_items JSONB)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
AS $$
DECLARE
  item            JSONB;
  comp            JSONB;
  parent_qty      INTEGER;
  comp_qty        INTEGER;
  total_req       INTEGER;
  avail_stock     INTEGER;
  item_name       TEXT;
  product_type_v  TEXT;
BEGIN
  -- Phase 1: Validate all stock before mutating
  FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    parent_qty := (item->>'quantity')::INTEGER;

    SELECT p.stock_quantity, p.name, p.product_type
      INTO avail_stock, item_name, product_type_v
      FROM public.products p
     WHERE p.id = (item->>'product_id')::TEXT;

    IF avail_stock IS NULL THEN
      RAISE EXCEPTION 'Product not found: %', item->>'product_id';
    END IF;

    -- For non-kit products, validate parent stock as before.
    -- For kit products, stock is validated via component variants.
    IF COALESCE(product_type_v, 'standard') <> 'kit' AND avail_stock < parent_qty THEN
      RAISE EXCEPTION 'Insufficient stock for "%": available %, requested %',
        item_name, avail_stock, parent_qty;
    END IF;

    -- Validate each selected component variant
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
        SELECT p.name || ' - ' || pv.variant_name
          INTO item_name
          FROM public.product_variants pv
          JOIN public.products p ON p.id = pv.product_id
         WHERE pv.id = (comp->>'variant_id')::TEXT;

        RAISE EXCEPTION 'Insufficient component stock for "%": available %, required %',
          COALESCE(item_name, comp->>'variant_id'), avail_stock, total_req;
      END IF;
    END LOOP;
  END LOOP;

  -- Phase 2: Deduct stock atomically
  FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    parent_qty := (item->>'quantity')::INTEGER;

    SELECT p.product_type
      INTO product_type_v
      FROM public.products p
     WHERE p.id = (item->>'product_id')::TEXT;

    -- Deduct parent stock for non-kit products only
    IF COALESCE(product_type_v, 'standard') <> 'kit' THEN
      UPDATE public.products
         SET stock_quantity = stock_quantity - parent_qty
       WHERE id = (item->>'product_id')::TEXT;
    END IF;

    -- Deduct each selected component variant
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

GRANT EXECUTE ON FUNCTION public.validate_and_deduct_stock(JSONB) TO anon, authenticated;
