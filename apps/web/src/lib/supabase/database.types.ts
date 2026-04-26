export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export interface Database {
	public: {
		Tables: {
			users: {
				Row: {
					id: string;
					email: string;
					first_name: string | null;
					last_name: string | null;
					phone_number: string | null;
					role: string;
					created_at: string;
				};
				Insert: {
					id: string;
					email: string;
					first_name?: string | null;
					last_name?: string | null;
					phone_number?: string | null;
					role?: string;
					created_at?: string;
				};
				Update: {
					id?: never;
					email?: string;
					first_name?: string | null;
					last_name?: string | null;
					phone_number?: string | null;
					role?: string;
					created_at?: never;
				};
				Relationships: [];
			};

			user_addresses: {
				Row: {
					id: string;
					user_id: string | null;
					address_line: string;
					city: string;
					city_code: string;
					country: string;
					is_default: boolean;
					full_name: string;
					address: string;
					phone_number: string;
					ward_district: string;
					ward_district_code: string;
				};
				Insert: {
					id: string;
					user_id?: string | null;
					address_line: string;
					city: string;
					city_code: string;
					country: string;
					is_default?: boolean;
					full_name: string;
					address: string;
					phone_number: string;
					ward_district: string;
					ward_district_code: string;
				};
				Update: {
					id?: never;
					user_id?: string | null;
					address_line?: string;
					city?: string;
					city_code?: string;
					country?: string;
					is_default?: boolean;
					full_name?: string;
					address?: string;
					phone_number?: string;
					ward_district?: string;
					ward_district_code?: string;
				};
				Relationships: [];
			};

			categories: {
				Row: {
					id: string;
					name: string;
					slug: string;
					thumbnail: string | null;
					images: Json | null;
				};
				Insert: {
					id: string;
					name: string;
					slug: string;
					thumbnail?: string | null;
					images?: Json | null;
				};
				Update: {
					id?: never;
					name?: string;
					slug?: string;
					thumbnail?: string | null;
					images?: Json | null;
				};
				Relationships: [];
			};

			products: {
				Row: {
					id: string;
					category_id: string | null;
					name: string;
					slug: string;
					base_price: number;
					stock_quantity: number;
					thumbnail: string | null;
					images: Json | null;
					product_type: "standard" | "kit" | "component";
				};
				Insert: {
					id: string;
					category_id?: string | null;
					name: string;
					slug: string;
					base_price: number;
					stock_quantity?: number;
					thumbnail?: string | null;
					images?: Json | null;
					product_type?: "standard" | "kit" | "component";
				};
				Update: {
					id?: never;
					category_id?: string | null;
					name?: string;
					slug?: string;
					base_price?: number;
					stock_quantity?: number;
					thumbnail?: string | null;
					images?: Json | null;
					product_type?: "standard" | "kit" | "component";
				};
				Relationships: [];
			};

			product_variants: {
				Row: {
					id: string;
					product_id: string | null;
					variant_name: string;
					price_adjustment: number;
					thumbnail: string | null;
				};
				Insert: {
					id: string;
					product_id?: string | null;
					variant_name: string;
					price_adjustment?: number;
					thumbnail?: string | null;
				};
				Update: {
					id?: never;
					product_id?: string | null;
					variant_name?: string;
					price_adjustment?: number;
					thumbnail?: string | null;
				};
				Relationships: [];
			};

			product_components: {
				Row: {
					id: string;
					parent_product_id: string | null;
					component_product_id: string | null;
					component_group: string;
					is_required: boolean;
				};
				Insert: {
					id: string;
					parent_product_id?: string | null;
					component_product_id?: string | null;
					component_group: string;
					is_required?: boolean;
				};
				Update: {
					id?: never;
					parent_product_id?: string | null;
					component_product_id?: string | null;
					component_group?: string;
					is_required?: boolean;
				};
				Relationships: [];
			};

			carts: {
				Row: {
					id: string;
					user_id: string | null;
				};
				Insert: {
					id: string;
					user_id?: string | null;
				};
				Update: {
					id?: never;
					user_id?: string | null;
				};
				Relationships: [];
			};

			cart_items: {
				Row: {
					id: string;
					cart_id: string | null;
					product_id: string | null;
					variant_id: string | null;
					quantity: number;
					parent_cart_item_id: string | null;
				};
				Insert: {
					id: string;
					cart_id?: string | null;
					product_id?: string | null;
					variant_id?: string | null;
					quantity?: number;
					parent_cart_item_id?: string | null;
				};
				Update: {
					id?: never;
					cart_id?: string | null;
					product_id?: string | null;
					variant_id?: string | null;
					quantity?: number;
					parent_cart_item_id?: string | null;
				};
				Relationships: [];
			};

			orders: {
				Row: {
					id: string;
					user_id: string | null;
					order_number: string;
					status: string;
					total_price: number;
					shipping_fee: number | null;
				};
				Insert: {
					id: string;
					user_id?: string | null;
					order_number: string;
					status?: string;
					shipping_fee?: number | null;
					total_price: number;
				};
				Update: {
					id?: never;
					user_id?: string | null;
					order_number?: string;
					status?: string;
					total_price?: number;
					shipping_fee?: number | null;
				};
				Relationships: [];
			};

			order_items: {
				Row: {
					id: string;
					order_id: string | null;
					product_id: string | null;
					product_name: string;
					unit_price: number;
					quantity: number;
					thumbnail: string | null;
				};
				Insert: {
					id: string;
					order_id?: string | null;
					product_id?: string | null;
					product_name: string;
					unit_price: number;
					quantity: number;
					thumbnail?: string | null;
				};
				Update: {
					id?: never;
					order_id?: string | null;
					product_id?: string | null;
					product_name?: string;
					unit_price?: number;
					quantity?: number;
					thumbnail?: string | null;
				};
				Relationships: [];
			};

			order_item_components: {
				Row: {
					id: string;
					order_item_id: string;
					variant_id: string;
					variant_name: string;
					component_group: string;
					price_adjustment: number | null;
					thumbnail: string | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					order_item_id: string;
					variant_id: string;
					variant_name: string;
					component_group: string;
					price_adjustment?: number | null;
					thumbnail?: string | null;
					created_at?: string;
				};
				Update: {
					id?: never;
					order_item_id?: string;
					variant_id?: string;
					variant_name?: string;
					component_group?: string;
					price_adjustment?: number | null;
					thumbnail?: string | null;
					created_at?: never;
				};
				Relationships: [];
			};
			order_services: {
				Row: {
					id: string;
					order_id: string | null;
					service_id: string | null;
					price: number;
				};
				Insert: {
					id: string;
					order_id?: string | null;
					service_id?: string | null;
					price: number;
				};
				Update: {
					id?: never;
					order_id?: string | null;
					service_id?: string | null;
					price?: number;
				};
				Relationships: [];
				shipping_fee?: number | null;
			};

			services: {
				Row: {
					id: string;
					name: string;
					base_price: number;
				};
				Insert: {
					id: string;
					name: string;
					base_price: number;
				};
				Update: {
					id?: never;
					name?: string;
					base_price?: number;
				};
				Relationships: [];
			};
		};
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: Record<string, never>;
		CompositeTypes: Record<string, never>;
	};
}

// Users
export type User = Database["public"]["Tables"]["users"]["Row"];
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
export type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

// Order Item Components
export type OrderItemComponent =
	Database["public"]["Tables"]["order_item_components"]["Row"];
export type OrderItemComponentInsert =
	Database["public"]["Tables"]["order_item_components"]["Insert"];
export type OrderItemComponentUpdate =
	Database["public"]["Tables"]["order_item_components"]["Update"];

// User Addresses
export type UserAddress = Database["public"]["Tables"]["user_addresses"]["Row"];
export type UserAddressInsert =
	Database["public"]["Tables"]["user_addresses"]["Insert"];
export type UserAddressUpdate =
	Database["public"]["Tables"]["user_addresses"]["Update"];

// Categories
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type CategoryInsert =
	Database["public"]["Tables"]["categories"]["Insert"];
export type CategoryUpdate =
	Database["public"]["Tables"]["categories"]["Update"];

// Products
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
export type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

// Product Variants
export type ProductVariant =
	Database["public"]["Tables"]["product_variants"]["Row"];
export type ProductVariantInsert =
	Database["public"]["Tables"]["product_variants"]["Insert"];
export type ProductVariantUpdate =
	Database["public"]["Tables"]["product_variants"]["Update"];

// Product Components
export type ProductComponent =
	Database["public"]["Tables"]["product_components"]["Row"];
export type ProductComponentInsert =
	Database["public"]["Tables"]["product_components"]["Insert"];
export type ProductComponentUpdate =
	Database["public"]["Tables"]["product_components"]["Update"];

// Carts
export type Cart = Database["public"]["Tables"]["carts"]["Row"];
export type CartInsert = Database["public"]["Tables"]["carts"]["Insert"];
export type CartUpdate = Database["public"]["Tables"]["carts"]["Update"];

// Cart Items
export type CartItem = Database["public"]["Tables"]["cart_items"]["Row"];
export type CartItemInsert =
	Database["public"]["Tables"]["cart_items"]["Insert"];
export type CartItemUpdate =
	Database["public"]["Tables"]["cart_items"]["Update"];

// Orders
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];
export type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"];

// Order Items
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type OrderItemInsert =
	Database["public"]["Tables"]["order_items"]["Insert"];
export type OrderItemUpdate =
	Database["public"]["Tables"]["order_items"]["Update"];

// Order Services
export type OrderService =
	Database["public"]["Tables"]["order_services"]["Row"];
export type OrderServiceInsert =
	Database["public"]["Tables"]["order_services"]["Insert"];
export type OrderServiceUpdate =
	Database["public"]["Tables"]["order_services"]["Update"];

// Services
export type Service = Database["public"]["Tables"]["services"]["Row"];
export type ServiceInsert = Database["public"]["Tables"]["services"]["Insert"];
export type ServiceUpdate = Database["public"]["Tables"]["services"]["Update"];
