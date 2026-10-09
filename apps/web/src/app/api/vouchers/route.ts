import { getCache, setCache } from "@/lib/redis/cache";
import { createClient } from "@/lib/supabase/server";
import type { VoucherRow } from "@/types/voucher";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/vouchers
 * Fetch all active, non-deleted vouchers within the current time window.
 * Public endpoint (no auth required).
 */
export async function GET() {
  try {
    const cacheKey = "vouchers";
    const cached = await getCache<{ vouchers: never[]; data: never[] }>(
      cacheKey
    );
    if (cached) return NextResponse.json(cached);

    const supabase = await createClient();
    const voucherClient = supabase as typeof supabase & {
      from: (relation: "vouchers") => {
        select: (columns: string) => {
          eq: (
            column: string,
            value: string
          ) => {
            is: (
              column: string,
              value: null
            ) => {
              or: (filters: string) => {
                or: (filters: string) => {
                  order: (
                    column: string,
                    options: { ascending: boolean }
                  ) => PromiseLike<{
                    data: unknown[] | null;
                    error: unknown;
                  }>;
                };
              };
            };
          };
        };
      };
    };

    // Fetch all active vouchers (not deleted, within valid date range, active status).
    // start_at/end_at are nullable — NULL means open-ended (no start/no expiry),
    // matching the DB CHECK (vouchers_time_window) and the RLS policy semantics.
    const now = new Date().toISOString();
    const { data: vouchers, error } = await voucherClient
      .from("vouchers")
      .select("*")
      .eq("status", "active")
      .is("deleted_at", null)
      .or(`start_at.is.null,start_at.lte.${now}`)
      .or(`end_at.is.null,end_at.gte.${now}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/vouchers] Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch vouchers" },
        { status: 500 }
      );
    }

    const allVouchers = (vouchers ?? []) as unknown as VoucherRow[];

    // Public listing excludes:
    //  - customer-specific vouchers (customer_ids set)
    //  - product/category-scoped vouchers (surfaced only via /eligible auto-apply)
    // Shipping reward types carry scope_type 'order_total', so they are
    // included here like any other whole-order voucher.
    const resolvedVouchers = allVouchers.filter(
      (v) =>
        v.scope_type === "order_total" &&
        (!v.customer_ids || v.customer_ids.length === 0)
    );

    const result = {
      vouchers: resolvedVouchers,
      data: resolvedVouchers,
    };
    await setCache(cacheKey, result, 60);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/vouchers] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
