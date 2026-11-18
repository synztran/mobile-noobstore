# Migration 169 — Product Reviews Images and Decimal Star Ratings

**SQL:** [`169_product_reviews_images_and_decimal_rating.sql`](../../supabase/migrations/169_product_reviews_images_and_decimal_rating.sql)

## Purpose

Enable granular ratings (such as 4.5 stars) and customer photo attachments on product reviews to increase customer trust and social proof on storefront detail pages.

## Changes

- **Affected tables:** `public.product_reviews`
- **Columns altered:**
  - `rating`: type changed from `SMALLINT` to `NUMERIC(2,1)`
- **Constraints updated:**
  - `product_reviews_rating_check`: updated from `CHECK (rating >= 1 AND rating <= 5)` to `CHECK (rating >= 1.0 AND rating <= 5.0)`
- **Columns added:**
  - `images`: `JSONB NOT NULL DEFAULT '[]'::jsonb` to store array of attachment image URLs

## System behavior

- Customers can now submit half-star ratings (e.g. 4.5★) with clear sentiment descriptors.
- Customers can upload up to 4 images with real-time preview, deletion, and gallery lightbox display.
- Review feed on `/shop/[slug]` shows customer photo gallery and ratings calculated with decimal precision.

## Existing data

- Existing reviews maintain their exact integer rating without data loss (`5` becomes `5.0`).
- Existing reviews automatically receive `images = '[]'::jsonb`.

## Deployment

1. Apply `supabase/migrations/169_product_reviews_images_and_decimal_rating.sql` to Supabase.
2. Verify table columns and constraints on `public.product_reviews`.

## Rollback

```sql
ALTER TABLE public.product_reviews ALTER COLUMN rating TYPE SMALLINT USING ROUND(rating)::SMALLINT;
ALTER TABLE public.product_reviews DROP CONSTRAINT IF EXISTS product_reviews_rating_check;
ALTER TABLE public.product_reviews ADD CONSTRAINT product_reviews_rating_check CHECK (rating >= 1 AND rating <= 5);
ALTER TABLE public.product_reviews DROP COLUMN IF EXISTS images;
```
