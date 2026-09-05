// ─── Cart contract types — single home ───────────────────────────────────────
//
// Every cart shape the app shares lives here: the client store/UI items
// (CartItem), the server wire shapes (CartApiItem / UpsertCartInput), and the
// HTTP contract of the cart API routes (AddCartItemRequest / Response).
// Product shapes are imported from the products module — the cross-module
// contract seam. Never export cart types from an API route file.
import type {
  PreOrderConfig,
  Product,
  ProductVariant,
  SelectedComponent,
} from "@/modules/products/types";

/** A resolved gift attached to a cart line (from the gifts upsell flow). */
export interface CartGift {
  gift_name: string;
  gift_slug: string;
  gift_thumbnail: string | null;
  quantity: number;
}

export interface CartItem {
  /** cart_items.id — may be absent for items not yet synced from server */
  id?: string;
  product: Product;
  variant: ProductVariant | null;
  /** For composite kits: the resolved component selections */
  components?: SelectedComponent[];
  quantity: number;
  gifts?: CartGift[];
  is_pre_order?: boolean;
  pre_order_config?: PreOrderConfig | null;
}

/** Server wire shape for one cart_items row (parent or child) + joined rows. */
export interface CartApiItem {
  id: string;
  cart_id: string | null;
  product_id: string | null;
  variant_id: string | null;
  parent_cart_item_id: string | null;
  quantity: number;
  product: {
    id: string;
    name: string;
    base_price: number;
    stock_quantity: number;
    thumbnail: string | null;
    is_pre_order?: boolean;
    pre_order_config?: PreOrderConfig | null;
    brand: string | null;
  } | null;
  variant: {
    id: string;
    variant_name: string;
    price_adjustment: number;
    thumbnail: string | null;
    is_pre_order?: boolean;
    pre_order_config?: PreOrderConfig | null;
  } | null;
  children: CartApiItem[];
  component_group?: string | null;
}

export interface UpsertCartInput {
  product_id: string;
  variant_id?: string | null;
  quantity?: number;
  components?: { variant_id: string }[];
}

/** POST /api/cart/items request body. */
export interface AddCartItemRequest extends UpsertCartInput {}

/** POST /api/cart/items response body. */
export interface AddCartItemResponse {
  cart_id: string;
  item_id: string;
}
