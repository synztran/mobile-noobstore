import { getCache, setCache } from "@/lib/redis/cache";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type FeeRow = {
  delivery_immediate_price: number | string;
  delivery_basic_price: number | string;
  insurance_fee: number | string;
  packing_fee: number | string;
  handling_fee: number | string;
  updated_at: string | null;
};

function toNumber(value: number | string | null | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function getFeesConfig() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fees")
    .select(
      "delivery_immediate_price, delivery_basic_price, insurance_fee, packing_fee, handling_fee, updated_at"
    )
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  if (!data) {
    return { data: null, error: "Fees config not found" };
  }

  const feeRow = data as FeeRow;

  return {
    data: {
      delivery_immediate_price: toNumber(
        feeRow.delivery_immediate_price,
        80000
      ),
      delivery_basic_price: toNumber(feeRow.delivery_basic_price, 40000),
      insurance_fee: toNumber(feeRow.insurance_fee, 10000),
      packing_fee: toNumber(feeRow.packing_fee, 15000),
      handling_fee: toNumber(feeRow.handling_fee, 20000),
      updated_at: feeRow.updated_at,
    },
    error: null,
  };
}

export async function GET() {
  const cacheKey = "config:fees";
  type FeesData = {
    delivery_immediate_price: number;
    delivery_basic_price: number;
    insurance_fee: number;
    packing_fee: number;
    handling_fee: number;
    updated_at: string | null;
  };
  const cached = await getCache<FeesData>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const { data, error } = await getFeesConfig();

  if (error || !data) {
    return NextResponse.json(
      { error: error ?? "Failed to load fees config" },
      { status: 500 }
    );
  }

  await setCache(cacheKey, data, 600);
  return NextResponse.json(data);
}
