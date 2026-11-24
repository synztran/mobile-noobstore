-- Broadcast committed bid/auction changes to private, auction-scoped channels.
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

  PERFORM realtime.broadcast_changes(
    'auction:' || v_auction_id::TEXT,
    v_event,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auction_bids_realtime_broadcast ON public.auction_bids;
CREATE TRIGGER auction_bids_realtime_broadcast
AFTER INSERT OR UPDATE OR DELETE ON public.auction_bids
FOR EACH ROW EXECUTE FUNCTION public.broadcast_auction_realtime_change();

DROP TRIGGER IF EXISTS auction_products_realtime_broadcast ON public.auction_products;
CREATE TRIGGER auction_products_realtime_broadcast
AFTER UPDATE ON public.auction_products
FOR EACH ROW EXECUTE FUNCTION public.broadcast_auction_realtime_change();

REVOKE ALL ON FUNCTION public.broadcast_auction_realtime_change() FROM PUBLIC, anon, authenticated;

CREATE POLICY "auction_channel_members_read"
ON realtime.messages
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.auction_products ap
    WHERE realtime.topic() = 'auction:' || ap.id::TEXT
      AND ap.status <> 'draft'
  )
);
