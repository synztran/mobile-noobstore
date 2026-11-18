-- Migration 168: Product Addons / Frequently Bought Together deals
-- Configurable cross-sell addon products with custom discount per main product

CREATE TABLE IF NOT EXISTS product_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  main_product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  addon_product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value NUMERIC NOT NULL CHECK (discount_value >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_product_addon UNIQUE (main_product_id, addon_product_id),
  CONSTRAINT chk_diff_products CHECK (main_product_id <> addon_product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_addons_main_active 
  ON product_addons (main_product_id, is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_product_addons_addon 
  ON product_addons (addon_product_id);

-- RLS
ALTER TABLE product_addons ENABLE ROW LEVEL SECURITY;

-- Public can read active addons
CREATE POLICY "product_addons_public_select"
  ON product_addons
  FOR SELECT
  TO public
  USING (is_active = true);

-- Authenticated admins can manage all addons
CREATE POLICY "product_addons_admin_all"
  ON product_addons
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
        AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
        AND users.role = 'admin'
    )
  );

-- Service role bypasses RLS
GRANT ALL ON product_addons TO service_role;
GRANT SELECT ON product_addons TO anon, authenticated;
