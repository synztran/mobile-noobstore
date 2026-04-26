-- ============================================================
-- Migration: 008_add_addresses_column_to_users
-- Description: Adds addresses JSONB column to public.users and
--              backfills from public.user_addresses when available.
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS addresses JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Keep addresses payload structurally safe.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_addresses_is_array_chk'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_addresses_is_array_chk
      CHECK (jsonb_typeof(addresses) = 'array');
  END IF;
END;
$$;

-- Backfill users.addresses from user_addresses table (if that table exists).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_addresses'
  ) THEN
    UPDATE public.users u
    SET addresses = COALESCE(src.addresses, '[]'::jsonb)
    FROM (
      SELECT
        ua.user_id,
        jsonb_agg(
          jsonb_build_object(
            'id', ua.id,
            'full_name', ua.full_name,
            'address', ua.address,
            'phone_number', ua.phone_number,
            'city', ua.city,
            'ward_district', ua.ward_district,
            'is_default', ua.is_default,
            'created_at', ua.created_at,
            'updated_at', ua.updated_at
          )
          ORDER BY ua.is_default DESC, ua.created_at ASC
        ) AS addresses
      FROM public.user_addresses ua
      GROUP BY ua.user_id
    ) AS src
    WHERE u.id = src.user_id;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS users_addresses_gin_idx
  ON public.users
  USING GIN (addresses);
