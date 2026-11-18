-- Migration 169: Support Decimal Star Ratings (e.g. 4.5) and Review Images
-- Allows half-star ratings and photo attachments on product reviews

-- 1. Alter rating to NUMERIC(2,1)
ALTER TABLE public.product_reviews
  ALTER COLUMN rating TYPE NUMERIC(2,1);

-- 2. Update check constraint on rating to support decimal range 1.0 to 5.0
ALTER TABLE public.product_reviews
  DROP CONSTRAINT IF EXISTS product_reviews_rating_check;

ALTER TABLE public.product_reviews
  ADD CONSTRAINT product_reviews_rating_check
  CHECK (rating >= 1.0 AND rating <= 5.0);

-- 3. Add images JSONB column
ALTER TABLE public.product_reviews
  ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb;
