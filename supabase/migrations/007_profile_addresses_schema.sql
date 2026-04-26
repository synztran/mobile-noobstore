-- ============================================================
-- Migration: 007_profile_addresses_schema
-- Description: Defines normalized user address schema for profile addresses.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_addresses (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        TEXT        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  full_name      TEXT        NOT NULL,
  address        TEXT        NOT NULL,
  phone_number   TEXT        NOT NULL,
  city           TEXT        NOT NULL,
  ward_district  TEXT        NOT NULL,
  is_default     BOOLEAN     NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Make migration safe on environments where user_addresses already exists
ALTER TABLE public.user_addresses
  ADD COLUMN IF NOT EXISTS user_id TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS ward_district TEXT,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Align user_id type with public.users.id (TEXT)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_addresses'
      AND column_name = 'user_id'
      AND udt_name = 'uuid'
  ) THEN
    ALTER TABLE public.user_addresses
      ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
  END IF;
END;
$$;

-- Backfill from legacy columns when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_addresses'
      AND column_name = 'address_line'
  ) THEN
    EXECUTE '
      UPDATE public.user_addresses
      SET address = COALESCE(address, address_line)
      WHERE address IS NULL
    ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_addresses'
      AND column_name = 'country'
  ) THEN
    EXECUTE '
      UPDATE public.user_addresses
      SET ward_district = COALESCE(ward_district, country)
      WHERE ward_district IS NULL
    ';
  END IF;
END;
$$;

ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own addresses" ON public.user_addresses;
CREATE POLICY "Users can view own addresses"
  ON public.user_addresses
  FOR SELECT
  USING (auth.uid()::TEXT = user_id);

DROP POLICY IF EXISTS "Users can insert own addresses" ON public.user_addresses;
CREATE POLICY "Users can insert own addresses"
  ON public.user_addresses
  FOR INSERT
  WITH CHECK (auth.uid()::TEXT = user_id);

DROP POLICY IF EXISTS "Users can update own addresses" ON public.user_addresses;
CREATE POLICY "Users can update own addresses"
  ON public.user_addresses
  FOR UPDATE
  USING (auth.uid()::TEXT = user_id)
  WITH CHECK (auth.uid()::TEXT = user_id);

DROP POLICY IF EXISTS "Users can delete own addresses" ON public.user_addresses;
CREATE POLICY "Users can delete own addresses"
  ON public.user_addresses
  FOR DELETE
  USING (auth.uid()::TEXT = user_id);

DROP INDEX IF EXISTS user_addresses_single_default_idx;
CREATE UNIQUE INDEX user_addresses_single_default_idx
  ON public.user_addresses (user_id)
  WHERE is_default = true;

-- Ensure updated_at trigger function exists in fresh environments
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_addresses_updated_at ON public.user_addresses;
CREATE TRIGGER user_addresses_updated_at
  BEFORE UPDATE ON public.user_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_addresses TO authenticated;
