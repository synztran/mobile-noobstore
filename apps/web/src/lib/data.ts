export interface Product {
	id: string;
	name: string;
	category: string;
	base_price: number;
	stock_quantity: number;
	thumbnail?: string | null;
	variants?: ProductVariant[];
}

export interface ProductVariant {
	id: string;
	product_id?: string | null;
	variant_name: string;
	price_adjustment: number;
	effective_price: number;
	thumbnail?: string | null;
	is_pre_order?: boolean;
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
}

export interface CartItem {
	product: Product;
	variant: ProductVariant | null;
	/** For composite kits: the resolved component selections */
	components?: SelectedComponent[];
	quantity: number;
}

export interface ShippingDetails {
	fullName: string;
	streetAddress: string;
	apartment: string;
	city: string;
	cityCode: string;
	wardDistrict: string;
	wardDistrictCode: string;
	postalCode: string;
	phoneNumber: string;
	deliverySpeed: "standard" | "express" | "shipment";
}

export interface ProfileAddress {
	id: string;
	user_id: string;
	full_name: string;
	address: string;
	phone_number: string;
	city: string;
	city_code: string;
	ward_district: string;
	ward_district_code: string;
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
	wardDistrict: string;
	wardDistrictCode: string;
	isDefault?: boolean;
}

export const CATEGORIES = ["Keyboards", "Switches", "Add-Ons", "Cables"];

export const SHIPPING_COST = {
	standard: 0,
	express: 15,
};

export const TAX_RATE = 0.0517; // ~5.17%
