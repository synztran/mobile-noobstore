import type { Product } from "@/modules/products/types";

// ── Account / profile ─────────────────────────────────────────────────────────

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

// ── Wishlist ──────────────────────────────────────────────────────────────────
// API contract types previously exported from app/api/wishlist/* route files.
// Routes now import from here — never export types from route files.

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

export interface WishlistProductSummary {
	id: string;
	name: string;
	slug: string;
	base_price: number;
	thumbnail: string | null;
	stock_quantity: number | null;
	brand: string | null;
}

export interface WishlistItemResponse {
	id: string;
	product_id: string;
	added_at: string;
	product: WishlistProductSummary | null;
}

export interface AddWishlistRequest {
	productId: string;
}

export interface AddWishlistResponse {
	success: boolean;
	wishlistId: string;
}
