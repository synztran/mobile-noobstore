-- ============================================================
-- Migration: 019_add_is_used_to_products
-- Description: Add is_used boolean column to products table
--              to identify second-hand/used products
-- ============================================================

-- Add is_used column to products table with default value false
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_used BOOLEAN NOT NULL DEFAULT false;

-- Create an index on is_used for better query performance
CREATE INDEX IF NOT EXISTS idx_products_is_used ON public.products(is_used);

-- Update the trigger to refresh updated_at timestamp
-- (if a product's is_used field is modified, updated_at will be updated automatically)
