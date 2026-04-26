-- ============================================================
-- Migration: 009_create_fees_table
-- Description: Creates fees table, updated_at trigger function,
--              and seeds single default row (id = 1).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fees (
  id INTEGER NOT NULL DEFAULT 1,
  delivery_immediate_price NUMERIC(10, 2) NOT NULL DEFAULT 80000,
  delivery_basic_price NUMERIC(10, 2) NOT NULL DEFAULT 40000,
  insurance_fee NUMERIC(10, 2) NOT NULL DEFAULT 10000,
  packing_fee NUMERIC(10, 2) NOT NULL DEFAULT 15000,
  handling_fee NUMERIC(10, 2) NOT NULL DEFAULT 20000,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fees_pkey PRIMARY KEY (id),
  CONSTRAINT fees_single_row CHECK (id = 1)
) TABLESPACE pg_default;

-- Keep schema consistent if table already existed with missing columns
ALTER TABLE public.fees
  ADD COLUMN IF NOT EXISTS delivery_immediate_price NUMERIC(10, 2) NOT NULL DEFAULT 80000,
  ADD COLUMN IF NOT EXISTS delivery_basic_price NUMERIC(10, 2) NOT NULL DEFAULT 40000,
  ADD COLUMN IF NOT EXISTS insurance_fee NUMERIC(10, 2) NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS packing_fee NUMERIC(10, 2) NOT NULL DEFAULT 15000,
  ADD COLUMN IF NOT EXISTS handling_fee NUMERIC(10, 2) NOT NULL DEFAULT 20000,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure the single-row check exists even on pre-existing environments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fees_single_row'
      AND conrelid = 'public.fees'::regclass
  ) THEN
    ALTER TABLE public.fees
      ADD CONSTRAINT fees_single_row CHECK (id = 1);
  END IF;
END;
$$;

-- Dedicated trigger function requested by source script
CREATE OR REPLACE FUNCTION public.update_fees_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_fees_timestamp ON public.fees;
CREATE TRIGGER trigger_update_fees_timestamp
BEFORE UPDATE ON public.fees
FOR EACH ROW
EXECUTE FUNCTION public.update_fees_timestamp();

-- Seed default single row for import/fresh setup
INSERT INTO public.fees (
  id,
  delivery_immediate_price,
  delivery_basic_price,
  insurance_fee,
  packing_fee,
  handling_fee
)
VALUES (1, 80000, 40000, 10000, 15000, 20000)
ON CONFLICT (id) DO NOTHING;
