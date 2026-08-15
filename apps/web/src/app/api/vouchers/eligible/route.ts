import { createClient } from "@/lib/supabase/server";
import { sameShippingMethod } from "@/lib/shipping-method";
import type { VoucherRow } from "@/types/voucher";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ResolvedItem = {
  product_id: string;
  quantity: number;
  unit_price: number;
  category_slug?: string | null;
};

/**
 * GET /api/vouchers/eligible?product_ids=...&subtotal=...&shippingCost=...
 * Returns active, non-deleted vouchers eligible for auto-apply:
 *  - product/category-scoped vouchers that match the cart
 *  - customer-specific vouchers for the current session user
 * Order_total/shipping_fee vouchers are intentionally NOT auto-applied.
 */
export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const productIds = (url.searchParams.get("product_ids") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const shippingMethodId = url.searchParams.get("shipping_method_id") ?? "";

    // Resolve product → category slug for the cart items
    const categorySlugByProductId = new Map<string, string>();
    if (productIds.length > 0) {
      const { data: categoryRows } = await supabase
        .from("categories")
        .select("id, slug");

      const slugById = new Map(
        (categoryRows ?? []).map((c) => [c.id, c.slug])
      );

      const { data: productRows } = await supabase
        .from("products")
        .select("id, category_id")
        .in("id", productIds);

      for (const p of productRows ?? []) {
        if (p.category_id && slugById.has(p.category_id)) {
          categorySlugByProductId.set(p.id, slugById.get(p.category_id)!);
        }
      }
    }

    // Structural items (no pricing here; manual apply recomputes amounts)
    const items: ResolvedItem[] = productIds.map((id) => ({
      product_id: id,
      quantity: 1,
      unit_price: 0,
      category_slug: categorySlugByProductId.get(id) ?? null,
    }));

    const now = new Date();

    const { data: raw, error } = await supabase
      .from("vouchers")
      .select("*")
      .eq("status", "active")
      .is("deleted_at", null)
      .lte("start_at", now.toISOString())
      .gte("end_at", now.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/vouchers/eligible] error:", error);
      return NextResponse.json(
        { error: "Failed to fetch vouchers" },
        { status: 500 }
      );
    }

    const allVouchers = (raw ?? []) as unknown as VoucherRow[];
    const eligible: VoucherRow[] = [];

    for (const v of allVouchers) {
      // Only scoped + customer vouchers auto-apply
      const isScoped =
        v.scope_type === "product" || v.scope_type === "category";
      const isCustomerSpecific = (v.customer_ids ?? []).length > 0;
      if (!isScoped && !isCustomerSpecific) continue;

      // Customer-specific: only the target user
      if (isCustomerSpecific && !(v.customer_ids ?? []).includes(user.id)) {
        continue;
      }

      // Shipping-method restriction (empty list = unrestricted)
      const allowedMethods = v.applies_to_shipping_methods ?? [];
      if (allowedMethods.length > 0) {
        if (
          !shippingMethodId ||
          !allowedMethods.some((m) => sameShippingMethod(m, shippingMethodId))
        ) {
          continue;
        }
      }

      // Scope match against cart (skipped for customer-specific vouchers)
      if (isScoped) {
        const excl = new Set(v.excluded_product_ids ?? []);
        let matches = false;

        if (v.scope_type === "product") {
          const targets = new Set(v.applies_to_product_ids ?? []);
          matches = items.some(
            (i) => targets.has(i.product_id) && !excl.has(i.product_id)
          );
        } else if (v.scope_type === "category") {
          const targets = new Set(v.applies_to_category_slugs ?? []);
          matches = items.some(
            (i) =>
              targets.has(i.category_slug ?? "") && !excl.has(i.product_id)
          );
        }

        if (!matches) continue;
      }

      eligible.push(v);
    }

    return NextResponse.json({
      vouchers: eligible,
      categorySlugByProductId: Object.fromEntries(categorySlugByProductId),
    });
  } catch (err) {
    console.error("[GET /api/vouchers/eligible] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}