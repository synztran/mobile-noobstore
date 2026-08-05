import { invalidateCache } from "@/lib/redis/cache";
import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface FeesData {
  id: number;
  delivery_immediate_price: number;
  delivery_basic_price: number;
  insurance_fee: number;
  packing_fee: number;
  handling_fee: number;
  max_vouchers_per_order: number;
  updated_at: string | null;
}

export async function GET() {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("fees")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Fees config not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();

    const numericFields = [
      "delivery_immediate_price",
      "delivery_basic_price",
      "insurance_fee",
      "packing_fee",
      "handling_fee",
      "max_vouchers_per_order",
    ] as const;

    type FeeField = (typeof numericFields)[number];
    const payload: Partial<Record<FeeField, number>> = {};

    for (const field of numericFields) {
      const val = body[field];
      if (val !== undefined) {
        const num = Number(val);
        if (!Number.isFinite(num) || num < 0) {
          return NextResponse.json(
            { error: `${field} must be a non-negative number` },
            { status: 400 }
          );
        }
        if (field === "max_vouchers_per_order" && num < 1) {
          return NextResponse.json(
            { error: "max_vouchers_per_order must be at least 1" },
            { status: 400 }
          );
        }
        payload[field] = num;
      }
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();
    const { error } = await supabase
      .from("fees")
      .update(payload)
      .eq("id", 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await invalidateCache("config:fees");

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
