import { ITag } from "@/app/api/products/route";

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

export interface PreOrderConfig {
  estimate: string;
  available_date?: string | null;
  notes?: string | null;
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

export interface CartItem {
  /** cart_items.id — may be absent for items not yet synced from server */
  id?: string;
  product: Product;
  variant: ProductVariant | null;
  /** For composite kits: the resolved component selections */
  components?: SelectedComponent[];
  quantity: number;
  gifts?: Array<{
    gift_name: string;
    gift_slug: string;
    gift_thumbnail: string | null;
    quantity: number;
  }>;
  is_pre_order?: boolean;
  pre_order_config?: PreOrderConfig | null;
}

export interface ShippingDetails {
  fullName: string;
  streetAddress: string;
  apartment: string;
  city: string;
  cityCode: string;
  district: string;
  districtCode: string;
  ward: string;
  wardCode: string;
  postalCode: string;
  phoneNumber: string;
  notes?: string;
  deliverySpeed: "standard" | "express" | "shipment" | "preorder" | "pickup";
  /** Matches shipping_methods.id — same value as deliverySpeed for now */
  shippingMethodId: string;
  /** Chosen store pickup slot (ISO) when deliverySpeed === "pickup" */
  pickupAt?: string | null;
}

export interface ProfileAddress {
  id: string;
  user_id: string;
  full_name: string;
  address: string;
  phone_number: string;
  city: string;
  city_code: string;
  district: string;
  ward: string;
  district_code: string;
  ward_code: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileAddressInput {
  fullName: string;
  address: string;
  phoneNumber: string;
  city: string;
  cityCode: string;
  district: string;
  districtCode: string;
  ward: string;
  wardCode: string;
  isDefault?: boolean;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  added_at: string;
  product?: Product;
}

export interface WishlistItemInput {
  productId: string;
}

export const CATEGORIES = ["Keyboards", "Switches", "Add-Ons", "Cables"];

export const SHIPPING_COST = {
  standard: 0,
  express: 15,
};

export const TAX_RATE = 0.0517; // ~5.17%
