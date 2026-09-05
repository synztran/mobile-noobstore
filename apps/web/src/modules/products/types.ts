/**
 * Product domain contract types — the single source of truth for every layer:
 * server modules, API routes, react-query hooks, and UI components all import
 * from here. Never export product types from API route files.
 *
 * These shapes are intentionally kept verbatim from their original homes
 * (api/products routes, lib/data.ts, types/search.ts) so this restructure is
 * behavior-neutral. Consolidating overlapping shapes (Product vs ShopProduct
 * vs ProductListItem) is a separate follow-up.
 */

// ─── Primitive unions ────────────────────────────────────────────────────────

export type ProductType = "standard" | "kit" | "component" | "gift";

export type SortOption = "newest" | "price_asc" | "price_desc";

// ─── Shared leaf types ────────────────────────────────────────────────────────

export interface ITag {
  id: number;
  label: string;
  value: string;
  icon?: string;
  textColor?: string;
  bgColor?: string;
}

/** Config stored in the `pre_order_config` JSONB column. */
export interface PreOrderConfig {
  /** Human-readable shipping estimate, e.g. "2–3 tuần" */
  estimate: string;
  /** ISO date string for expected stock arrival, e.g. "2026-07-01" */
  available_date?: string | null;
  /** Optional note shown to the customer */
  notes?: string | null;
}

// ─── Cart-facing legacy shapes (from lib/data.ts) ────────────────────────────
// Used by the cart store / CartItem. Keep in sync with cart work; these will
// move to modules/cart when that domain gets its own pass.

export interface Product {
  id: string;
  name: string;
  category: string;
  base_price: number;
  stock_quantity: number;
  thumbnail?: string | null;
  variants?: ProductVariant[];
  is_used?: boolean;
  tags?: ITag[];
  is_pre_order?: boolean;
  pre_order_config?: PreOrderConfig | null;
  brand: string;
}

export interface ProductVariant {
  id: string;
  product_id?: string | null;
  variant_name: string;
  price_adjustment: number;
  effective_price: number;
  thumbnail?: string | null;
  is_pre_order?: boolean;
  pre_order_config?: PreOrderConfig | null;
}

/**
 * A selected component variant for a kit configurator.
 * Represents one resolved choice (e.g. "Blue Ocean Case").
 */
export interface SelectedComponent {
  /** The variant ID from product_variants */
  variant_id: string;
  /** Human-readable label, e.g. "Blue Ocean" */
  variant_name: string;
  /** The component group label, e.g. "Select Case" */
  component_group: string;
  price_adjustment: number;
  thumbnail: string | null;
  is_pre_order?: boolean;
  pre_order_config?: PreOrderConfig | null;
}

// ─── Product list contract (GET /api/products) ────────────────────────────────

export interface ShopVariant {
  id: string;
  variant_name: string;
  price_adjustment: number;
  effective_price: number;
  thumbnail: string | null;
  stock_quantity: number;
  is_pre_order: boolean;
  pre_order_config: PreOrderConfig | null;
  attributes: Record<string, string> | null;
}

export interface ShopProduct {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  category: string;
  description: string;
  base_price: number;
  stock_quantity: number;
  thumbnail: string | null;
  images: string[] | null;
  product_type: "standard" | "kit" | "component" | "gift";
  variants: ShopVariant[];
  min_price: number;
  is_used: boolean;
  is_pre_order: boolean;
  tags: ITag[];
  discount_price?: number;
  discount_percentage?: number;
  sale_ends_at?: string | null;
  sold_count: number;
  gifts?: Array<{
    gift_name: string;
    gift_slug: string;
    gift_thumbnail: string | null;
    quantity: number;
  }>;
}

export interface ProductsResponse {
  products: ShopProduct[];
  total: number;
}

// ─── Product detail contract (GET /api/products/[slug]) ──────────────────────

export interface ShopVariantDetail {
  id: string;
  variant_name: string;
  price_adjustment: number;
  effective_price: number;
  thumbnail: string | null;
  stock_quantity: number;
  is_pre_order: boolean;
  pre_order_config: PreOrderConfig | null;
  attributes: Record<string, string> | null;
}

export interface ComponentProductDetail {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  thumbnail: string | null;
  images: string[] | null;
  product_type: ProductType;
  variants: ShopVariantDetail[];
}

export interface ProductComponentDetail {
  id: string;
  component_group: string;
  is_required: boolean;
  /** Max selectable variants in this optional group; null = unlimited. */
  max_quantity?: number | null;
  component_product: ComponentProductDetail;
}

export interface ProductDetail {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  description: string | null;
  category: string;
  category_id: string | null;
  base_price: number;
  stock_quantity: number;
  thumbnail: string | null;
  images: string[] | null;
  product_type: ProductType;
  variants: ShopVariantDetail[];
  components: ProductComponentDetail[];
  min_price: number;
  is_used: boolean;
  /** True when at least one variant is pre-order */
  is_pre_order: boolean;
  attributes?: Record<string, string> | null;
  sale_ends_at?: string | null;
  sold_count: number;
  gifts?: Array<{
    gift_name: string;
    gift_slug: string;
    gift_thumbnail: string | null;
    quantity: number;
  }>;
}

// ─── Kit configurator contract (GET /api/products/[slug]/configurator) ───────

export interface ConfiguratorVariant {
  id: string;
  variant_name: string;
  price_adjustment: number;
  thumbnail: string | null;
  stock_quantity: number;
  is_pre_order: boolean;
  pre_order_config: PreOrderConfig | null;
  sale_price_percent?: number;
  /** The component product this variant belongs to (used for rule resolution). */
  component_product_id?: string;
  attributes: Record<string, string> | null;
}

export interface ConfiguratorGroup {
  component_group: string;
  is_required: boolean;
  /** Max number of variants that may be selected in this (optional) group.
   *  null/0/undefined = unlimited multi-select. Unused for required groups. */
  max_quantity?: number | null;
  variants: ConfiguratorVariant[];
}

/** A single conditional-availability rule for a kit. */
export interface ComponentVariantRule {
  id: string;
  /** The variant that triggers this rule (e.g. case = red). */
  condition_variant_id: string;
  /** The component product whose variants get restricted. */
  target_component_product_id: string;
  /** Variants that ARE allowed when the rule fires. */
  allowed_variant_ids: string[];
}

export type ConfiguratorResponse = {
  groups: ConfiguratorGroup[];
  rules: ComponentVariantRule[];
};

// ─── Search suggestions ───────────────────────────────────────────────────────

export interface ProductSuggestion {
  id: string;
  name: string;
  slug: string;
  thumbnail: string | null;
  base_price: number;
  min_price: number;
  product_type: string;
}

// ─── Gift contract (GET /api/products/[slug]/gift) ───────────────────────────

export type GiftProductInfo = {
  id: string;
  gift_product_id: string;
  quantity: number;
  gift_name: string;
  gift_slug: string;
  gift_thumbnail: string | null;
};