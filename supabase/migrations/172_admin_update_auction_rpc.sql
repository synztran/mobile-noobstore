-- Serialize admin auction edits with place_auction_bid/buy_now_auction, which
-- lock the same auction row before inserting bids.
CREATE OR REPLACE FUNCTION public.admin_update_auction(
  p_auction_id UUID,
  p_updates JSONB,
  p_check_price_lock BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_auction public.auction_products%ROWTYPE;
  v_result JSONB;
BEGIN
  SELECT * INTO v_auction
  FROM public.auction_products
  WHERE id = p_auction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'auction_not_found';
  END IF;

  IF p_check_price_lock AND (
    v_auction.status = 'active'
    OR EXISTS (SELECT 1 FROM public.auction_bids WHERE auction_id = p_auction_id)
  ) THEN
    RAISE EXCEPTION 'auction_price_edit_forbidden';
  END IF;

  IF p_updates ? 'bin_price'
    AND p_updates->>'bin_price' IS NOT NULL
    AND (p_updates->>'bin_price')::NUMERIC <= COALESCE((p_updates->>'starting_price')::NUMERIC, v_auction.starting_price)
  THEN
    RAISE EXCEPTION 'auction_bin_price_invalid';
  END IF;

  UPDATE public.auction_products SET
    starting_price = COALESCE((p_updates->>'starting_price')::NUMERIC, starting_price),
    increment_type = COALESCE(p_updates->>'increment_type', increment_type),
    increment_value = COALESCE((p_updates->>'increment_value')::NUMERIC, increment_value),
    bin_price = CASE WHEN p_updates ? 'bin_price' THEN (p_updates->>'bin_price')::NUMERIC ELSE bin_price END,
    is_featured = COALESCE((p_updates->>'is_featured')::BOOLEAN, is_featured),
    status = COALESCE(p_updates->>'status', status),
    ends_at = COALESCE((p_updates->>'ends_at')::TIMESTAMPTZ, ends_at),
    starts_at = COALESCE((p_updates->>'starts_at')::TIMESTAMPTZ, starts_at),
    anti_snipe_minutes = COALESCE((p_updates->>'anti_snipe_minutes')::INTEGER, anti_snipe_minutes),
    required_customer_level = COALESCE((p_updates->>'required_customer_level')::INTEGER, required_customer_level),
    required_order_count = COALESCE((p_updates->>'required_order_count')::INTEGER, required_order_count),
    limit_bids_per_user = COALESCE((p_updates->>'limit_bids_per_user')::BOOLEAN, limit_bids_per_user),
    max_bids_per_user = CASE WHEN p_updates ? 'max_bids_per_user' THEN (p_updates->>'max_bids_per_user')::INTEGER ELSE max_bids_per_user END,
    product_details = CASE WHEN p_updates ? 'product_details' THEN p_updates->'product_details' ELSE product_details END,
    updated_at = COALESCE((p_updates->>'updated_at')::TIMESTAMPTZ, now())
  WHERE id = p_auction_id
  RETURNING to_jsonb(auction_products.*) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_auction(UUID, JSONB, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_auction(UUID, JSONB, BOOLEAN) TO service_role;
