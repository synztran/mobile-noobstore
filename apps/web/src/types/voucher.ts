export type VoucherStatus =
	| "draft"
	| "active"
	| "scheduled"
	| "expired"
	| "disabled";

export type VoucherRewardType =
	| "amount_off"
	| "percent_off"
	| "free_shipping"
	| "gift_item";

export type VoucherScopeType =
	| "order_total"
	| "shipping_fee"
	| "product"
	| "category";

export interface VoucherRule {
	min_order_amount: number;
	min_item_quantity: number | null;
	applies_to_product_ids: string[] | null;
	applies_to_category_slugs: string[] | null;
	excluded_product_ids: string[] | null;
	stackable: boolean;
	usage_limit_total: number | null;
	usage_limit_per_user: number | null;
	start_at: string | null;
	end_at: string | null;
}

export interface VoucherBenefit {
	reward_type: VoucherRewardType;
	amount_off: number | null;
	percent_off: number | null;
	max_discount_amount: number | null;
	gift_product_id: string | null;
	gift_variant_id: string | null;
	gift_quantity: number | null;
	free_shipping: boolean;
}

export interface VoucherRow {
	id: string;
	code: string;
	name: string;
	description: string | null;
	status: VoucherStatus;
	reward_type: VoucherRewardType;
	scope_type: VoucherScopeType;
	amount_off: number | null;
	percent_off: number | null;
	max_discount_amount: number | null;
	gift_product_id: string | null;
	gift_variant_id: string | null;
	gift_quantity: number | null;
	min_order_amount: number;
	min_item_quantity: number | null;
	applies_to_product_ids: string[] | null;
	applies_to_category_slugs: string[] | null;
	excluded_product_ids: string[] | null;
	stackable: boolean;
	usage_limit_total: number | null;
	usage_limit_per_user: number | null;
	used_count: number;
	start_at: string | null;
	end_at: string | null;
	metadata: Record<string, unknown>;
	created_by: string | null;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
}

export interface AppliedVoucherSummary {
	voucher_id: string;
	voucher_code: string;
	voucher_name: string;
	reward_type: VoucherRewardType;
	scope_type: VoucherScopeType;
	benefit: VoucherBenefit;
	rule: VoucherRule;
}

export interface OrderVoucherFields {
	voucher_id: string | null;
	voucher_code: string | null;
	voucher_discount_amount: number;
	shipping_discount_amount: number;
	voucher_snapshot: AppliedVoucherSummary | null;
	gift_items_snapshot: Array<{
		product_id: string;
		variant_id: string | null;
		quantity: number;
	}> | null;
}

export interface ApplyVoucherRequest {
	voucherId: string;
}

export interface ApplyVoucherResponse {
	success: boolean;
	voucherInfo: AppliedVoucherSummary;
	discountAmount: number;
	shippingDiscountAmount: number;
	gifts: Array<{
		product_id: string;
		variant_id: string | null;
		quantity: number;
	}>;
}
