-- Expand admin-editable scheduling and settlement fields while preserving
-- atomic price locks and stable database error codes.
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
  v_starts_at TIMESTAMPTZ;
  v_ends_at TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_auction
  FROM public.auction_products
  WHERE id = p_auction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'auction_not_found' USING ERRCODE = 'P0002', DETAIL = 'error_code=auction_not_found';
  END IF;

  IF p_check_price_lock AND (
    v_auction.status = 'active'
    OR EXISTS (SELECT 1 FROM public.auction_bids WHERE auction_id = p_auction_id)
  ) THEN
    RAISE EXCEPTION 'auction_price_edit_forbidden' USING ERRCODE = 'P0001', DETAIL = 'error_code=auction_price_edit_forbidden';
  END IF;

  IF p_updates ? 'bin_price'
    AND p_updates->>'bin_price' IS NOT NULL
    AND (p_updates->>'bin_price')::NUMERIC <= COALESCE((p_updates->>'starting_price')::NUMERIC, v_auction.starting_price)
  THEN
    RAISE EXCEPTION 'auction_bin_price_invalid' USING ERRCODE = 'P0001', DETAIL = 'error_code=auction_bin_price_invalid';
  END IF;

  BEGIN
    v_starts_at := COALESCE((p_updates->>'starts_at')::TIMESTAMPTZ, v_auction.starts_at);
    v_ends_at := COALESCE((p_updates->>'ends_at')::TIMESTAMPTZ, v_auction.ends_at);
    IF v_ends_at <= v_starts_at THEN
      RAISE EXCEPTION 'invalid schedule';
    END IF;
    IF (p_updates ? 'anti_snipe_minutes' AND (p_updates->>'anti_snipe_minutes')::INTEGER < 0)
      OR (p_updates ? 'winner_checkout_hours' AND (p_updates->>'winner_checkout_hours')::INTEGER <= 0)
      OR (p_updates ? 'max_winner_cascades' AND (p_updates->>'max_winner_cascades')::INTEGER < 0)
    THEN
      RAISE EXCEPTION 'invalid edit values';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'invalid schedule' THEN
      RAISE EXCEPTION 'auction_schedule_invalid' USING ERRCODE = 'P0001', DETAIL = 'error_code=auction_schedule_invalid';
    END IF;
    RAISE EXCEPTION 'auction_edit_value_invalid' USING ERRCODE = 'P0001', DETAIL = 'error_code=auction_edit_value_invalid';
  END;

  UPDATE public.auction_products SET
    starting_price = COALESCE((p_updates->>'starting_price')::NUMERIC, starting_price),
    increment_type = COALESCE((p_updates->>'increment_type')::public.bid_increment_type, increment_type),
    increment_value = COALESCE((p_updates->>'increment_value')::NUMERIC, increment_value),
    bin_price = CASE WHEN p_updates ? 'bin_price' THEN (p_updates->>'bin_price')::NUMERIC ELSE bin_price END,
    is_featured = COALESCE((p_updates->>'is_featured')::BOOLEAN, is_featured),
    status = COALESCE((p_updates->>'status')::public.auction_status, status),
    ends_at = v_ends_at,
    starts_at = v_starts_at,
    anti_snipe_minutes = COALESCE((p_updates->>'anti_snipe_minutes')::INTEGER, anti_snipe_minutes),
    winner_checkout_hours = COALESCE((p_updates->>'winner_checkout_hours')::INTEGER, winner_checkout_hours),
    max_winner_cascades = COALESCE((p_updates->>'max_winner_cascades')::INTEGER, max_winner_cascades),
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
