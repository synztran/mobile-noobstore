-- Optional auction-specific product specifications, condition and accessories.
ALTER TABLE public.auction_products
  ADD COLUMN IF NOT EXISTS product_details JSONB;
