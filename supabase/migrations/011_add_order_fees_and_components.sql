-- Add shipping_fee to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_fee numeric(10,2) DEFAULT 0;

-- Create order_item_components table to track components for each order item
CREATE TABLE IF NOT EXISTS order_item_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id text REFERENCES order_items(id) ON DELETE CASCADE NOT NULL,
  variant_id text NOT NULL,
  variant_name text NOT NULL,
  component_group text NOT NULL,
  price_adjustment numeric(10,2) DEFAULT 0,
  thumbnail text,
  created_at timestamp DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_order_item_components_order_item_id
  ON order_item_components(order_item_id);
