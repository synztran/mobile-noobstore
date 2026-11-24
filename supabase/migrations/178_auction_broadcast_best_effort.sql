-- Realtime is a notification side effect; it must never roll back a valid bid.
CREATE OR REPLACE FUNCTION public.broadcast_auction_realtime_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, realtime
AS $$
DECLARE
  v_auction_id UUID;
  v_event TEXT;
BEGIN
  IF TG_TABLE_NAME = 'auction_bids' THEN
    v_auction_id := COALESCE(NEW.auction_id, OLD.auction_id);
    v_event := 'bid_changed';
  ELSE
    v_auction_id := COALESCE(NEW.id, OLD.id);
    v_event := 'auction_changed';
  END IF;

  BEGIN
    PERFORM realtime.broadcast_changes(
      'auction:' || v_auction_id::TEXT,
      v_event,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );
  EXCEPTION WHEN OTHERS THEN
    -- Do not let a Realtime outage/configuration issue abort the bid transaction.
    RAISE WARNING 'Auction Realtime broadcast failed for auction %: %', v_auction_id, SQLERRM;
  END;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
