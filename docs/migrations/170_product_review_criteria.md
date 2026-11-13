# Migration 170 — Product Review Criteria

## Purpose

Store optional customer scores for packaging, product description/color accuracy, and delivery so product review highlights use actual feedback rather than static sample percentages.

## Changes

- Adds `product_reviews.criteria` as non-null JSONB, default `{}`.
- Adds a check that `criteria` is a JSON object.
- Replaces review insert RLS policy: authenticated users can insert only for a product in their delivered order, and only if they have not reviewed it.
- Adds a unique index on `(user_id, product_id)` to close concurrent duplicate-review races.
- No function, trigger, or grant changes.

## System behavior

- Review submission accepts optional integer scores from 1–5 for `packaging`, `description`, and `delivery`.
- Review POST and photo-upload API independently verify delivered-order eligibility; RLS also protects direct authenticated inserts.
- Product detail API returns per-criterion averages from reviews with a score for that criterion. Missing scores do not enter that criterion's average.
- Storefront displays “Chưa có đánh giá” when a criterion has no scores; empty star filters show an explicit empty message.

## Existing data

- Existing reviews receive `{}` and remain valid; no customer data is rewritten or deleted.
- Migration fails if duplicate `(user_id, product_id)` reviews already exist. Check and resolve duplicates before deployment.

## Deployment

1. Apply `supabase/migrations/170_product_review_criteria.sql`.
2. Deploy web application.
3. Verify column default/check, RLS eligibility, unique index, and submit a review with and without criteria.

## Rollback

Rollback requires restoring the original own-row insert policy and dropping the unique index, eligibility policy, criteria check, and `criteria` column. Scores collected after deployment will be lost; duplicate submissions may become possible again.
