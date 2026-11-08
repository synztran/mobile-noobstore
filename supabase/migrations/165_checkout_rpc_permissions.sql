-- Checkout RPCs are server entry points, not public APIs. The web application
-- calls them with its service-role client after validating auth and prices.
REVOKE ALL ON FUNCTION public.submit_order(uuid, uuid, text, numeric, numeric, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_order(uuid, uuid, text, numeric, numeric, jsonb)
  TO service_role;

REVOKE ALL ON FUNCTION public.submit_order_with_gifts(uuid, uuid, text, numeric, numeric, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_order_with_gifts(uuid, uuid, text, numeric, numeric, jsonb, jsonb)
  TO service_role;
