-- Store optional per-review experience scores for real, data-backed highlights.
ALTER TABLE public.product_reviews
  ADD COLUMN IF NOT EXISTS criteria JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.product_reviews
  ADD CONSTRAINT product_reviews_criteria_object_check
  CHECK (jsonb_typeof(criteria) = 'object');

-- Enforce delivered-order eligibility and one review per user/product even if
-- an authenticated client bypasses the web API.
DROP POLICY IF EXISTS "Users can insert their own reviews" ON public.product_reviews;
CREATE POLICY "Eligible buyers can insert own reviews"
  ON public.product_reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.product_id = product_reviews.product_id
        AND o.user_id = auth.uid()::text
        AND o.status = 'delivered'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS product_reviews_user_product_unique
  ON public.product_reviews (user_id, product_id);
