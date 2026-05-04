import { SHIPPING_COST } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { ApplyVoucherResponse, VoucherRow } from "@/types/voucher";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ApplyVoucherRequest {
	voucherId: string;
	subtotal?: number;
}

function toNumber(value: unknown, fallback = 0): number {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === "string") {
		const parsed = Number.parseFloat(value);
		return Number.isFinite(parsed) ? parsed : fallback;
	}

	return fallback;
}

/**
 * POST /api/vouchers/apply
 * Apply a voucher to the current user's cart and calculate discount amounts.
 * Requires authentication.
 */
export async function POST(req: Request) {
	try {
		const supabase = await createClient();
		const voucherClient = supabase as typeof supabase & {
			from: (relation: "vouchers" | "orders") => {
				select: (
					columns: string,
					options?: { count?: "exact" },
				) => {
					eq: (
						column: string,
						value: string,
					) => {
						single: () => PromiseLike<{
							data: unknown | null;
							error: unknown;
						}>;
						eq: (
							column: string,
							value: string,
						) => PromiseLike<{
							count: number | null;
						}>;
					};
				};
			};
		};

		// Get authenticated user
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 },
			);
		}

		const body: ApplyVoucherRequest = await req.json();
		const { voucherId, subtotal = 0 } = body;
		const normalizedSubtotal = Math.max(0, toNumber(subtotal, 0));

		if (!voucherId) {
			return NextResponse.json(
				{ error: "voucherId is required" },
				{ status: 400 },
			);
		}

		// Fetch the voucher
		const { data: voucher, error: voucherError } = await voucherClient
			.from("vouchers")
			.select("*")
			.eq("id", voucherId)
			.single();

		if (voucherError || !voucher) {
			return NextResponse.json(
				{ error: "Voucher not found" },
				{ status: 404 },
			);
		}

		const v = voucher as unknown as VoucherRow;

		// Validate voucher status and date range
		if (v.status !== "active") {
			return NextResponse.json(
				{ error: "Voucher is no longer active" },
				{ status: 400 },
			);
		}

		if (v.deleted_at) {
			return NextResponse.json(
				{ error: "Voucher has been deleted" },
				{ status: 400 },
			);
		}

		const now = new Date();
		if (
			(v.start_at && new Date(v.start_at) > now) ||
			(v.end_at && new Date(v.end_at) < now)
		) {
			return NextResponse.json(
				{ error: "Voucher is outside valid date range" },
				{ status: 400 },
			);
		}

		// Check usage limits
		if (
			v.usage_limit_total !== null &&
			v.used_count >= v.usage_limit_total
		) {
			return NextResponse.json(
				{ error: "Voucher usage limit exceeded" },
				{ status: 400 },
			);
		}

		// Check per-user usage limit
		if (v.usage_limit_per_user !== null && v.usage_limit_per_user > 0) {
			const ordersQuery = voucherClient
				.from("orders")
				.select("*", { count: "exact" }) as {
				eq: (
					column: string,
					value: string,
				) => {
					eq: (
						column: string,
						value: string,
					) => PromiseLike<{
						count: number | null;
					}>;
				};
			};

			const { count } = await ordersQuery
				.eq("user_id", user.id)
				.eq("voucher_id", voucherId);

			if ((count || 0) >= v.usage_limit_per_user) {
				return NextResponse.json(
					{ error: "You have already used this voucher" },
					{ status: 400 },
				);
			}
		}

		// Validate minimum order amount
		const minOrderAmount = toNumber(v.min_order_amount, 0);
		if (normalizedSubtotal < minOrderAmount) {
			return NextResponse.json(
				{
					error: `Đơn hàng phải tối thiểu ${minOrderAmount} VND để sử dụng voucher này`,
				},
				{ status: 400 },
			);
		}

		// Calculate discount amounts
		let discountAmount = 0;
		let shippingDiscountAmount = 0;

		if (v.reward_type === "amount_off") {
			discountAmount = toNumber(v.amount_off, 0);
		} else if (v.reward_type === "percent_off") {
			const percentValue = toNumber(v.percent_off, 0);
			discountAmount = Math.round(
				(normalizedSubtotal * percentValue) / 100,
			);
			// Apply cap if set
			const maxAmount = toNumber(v.max_discount_amount, 0);
			if (maxAmount > 0) {
				discountAmount = Math.min(discountAmount, maxAmount);
			}
		} else if (v.reward_type === "free_shipping") {
			shippingDiscountAmount = SHIPPING_COST.express;
		}

		discountAmount = Math.max(
			0,
			Math.min(discountAmount, normalizedSubtotal),
		);

		const response: ApplyVoucherResponse = {
			success: true,
			voucherInfo: {
				voucher_id: v.id,
				voucher_code: v.code,
				voucher_name: v.name,
				reward_type: v.reward_type,
				scope_type: v.scope_type,
				benefit: {
					reward_type: v.reward_type,
					amount_off: v.amount_off,
					percent_off: v.percent_off,
					max_discount_amount: v.max_discount_amount,
					gift_product_id: v.gift_product_id,
					gift_variant_id: v.gift_variant_id,
					gift_quantity: v.gift_quantity,
					free_shipping: v.reward_type === "free_shipping",
				},
				rule: {
					min_order_amount: v.min_order_amount,
					min_item_quantity: v.min_item_quantity,
					applies_to_product_ids: v.applies_to_product_ids,
					applies_to_category_slugs: v.applies_to_category_slugs,
					excluded_product_ids: v.excluded_product_ids,
					stackable: v.stackable,
					usage_limit_total: v.usage_limit_total,
					usage_limit_per_user: v.usage_limit_per_user,
					start_at: v.start_at,
					end_at: v.end_at,
				},
			},
			discountAmount,
			shippingDiscountAmount,
			gifts:
				v.reward_type === "gift_item" && v.gift_product_id
					? [
							{
								product_id: v.gift_product_id,
								variant_id: v.gift_variant_id,
								quantity: v.gift_quantity ?? 1,
							},
						]
					: [],
		};

		return NextResponse.json(response);
	} catch (err) {
		console.error("[POST /api/vouchers/apply] Unexpected error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
