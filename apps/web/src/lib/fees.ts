import { getPublicClient } from "@/lib/supabase/public";

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
	const supabase = getPublicClient();

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