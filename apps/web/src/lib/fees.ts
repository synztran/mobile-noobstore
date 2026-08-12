import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";

export interface FeesData {
	delivery_immediate_price: number;
	delivery_basic_price: number;
	insurance_fee: number;
	packing_fee: number;
	handling_fee: number;
	max_vouchers_per_order: number;
	updated_at: string | null;
}

type FeeRow = {
	delivery_immediate_price: number | string;
	delivery_basic_price: number | string;
	insurance_fee: number | string;
	packing_fee: number | string;
	handling_fee: number | string;
	max_vouchers_per_order: number | string;
	updated_at: string | null;
};

function toNumber(
	value: number | string | null | undefined,
	fallback: number,
) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

export async function getFeesConfig(): Promise<FeesData> {
	// Live DB restricts the fees table to authenticated reads only (no anon
	// policy), so an anon session client throws/returns nothing here and the
	// warm-up job records empty data. Tiny global config behind a 600s Redis
	// cache, so the RLS-bypassing admin client (server-only) is the right path.
	const supabase = getAdminClient();

	const { data, error } = await supabase
		.from("fees")
		.select(
			"delivery_immediate_price, delivery_basic_price, insurance_fee, packing_fee, handling_fee, max_vouchers_per_order, updated_at",
		)
		.eq("id", 1)
		.maybeSingle();

	if (error || !data) {
		throw new Error(error?.message ?? "Fees config not found");
	}

	const feeRow = data as FeeRow;

	return {
		delivery_immediate_price: toNumber(
			feeRow.delivery_immediate_price,
			80000,
		),
		delivery_basic_price: toNumber(feeRow.delivery_basic_price, 40000),
		insurance_fee: toNumber(feeRow.insurance_fee, 10000),
		packing_fee: toNumber(feeRow.packing_fee, 15000),
		handling_fee: toNumber(feeRow.handling_fee, 20000),
		max_vouchers_per_order: Math.max(
			1,
			toNumber(feeRow.max_vouchers_per_order, 2),
		),
		updated_at: feeRow.updated_at,
	};
}