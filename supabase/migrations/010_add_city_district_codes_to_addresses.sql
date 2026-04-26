-- Migration: 010_add_city_district_codes_to_addresses
-- Description: Adds city_code and ward_district_code columns to user_addresses
--              for structured city/district mapping via frontend constants.

ALTER TABLE public.user_addresses
  ADD COLUMN IF NOT EXISTS city_code TEXT,
  ADD COLUMN IF NOT EXISTS ward_district_code TEXT;

-- Index for filtering/joining by city_code per user
CREATE INDEX IF NOT EXISTS user_addresses_city_code_idx
  ON public.user_addresses (user_id, city_code);
