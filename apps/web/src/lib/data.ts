// Re-exported product, cart, and user types so existing unmigrated consumers
// (checkout, orders, services, …) keep working. These re-exports disappear when
// those domains get their own passes — products, cart, and user own the
// definitions now.
export type {
	CartItem,
} from "@/modules/cart/types";
export type {
	ITag,
	PreOrderConfig,
	Product,
	ProductVariant,
	SelectedComponent,
} from "@/modules/products/types";
export type {
	ProfileAddress,
	ProfileAddressInput,
	WishlistItem,
	WishlistItemInput,
} from "@/modules/user/types";

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

export const CATEGORIES = ["Keyboards", "Switches", "Add-Ons", "Cables"];

export const SHIPPING_COST = {
  standard: 0,
  express: 15,
};

export const TAX_RATE = 0.0517; // ~5.17%
