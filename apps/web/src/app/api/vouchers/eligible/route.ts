import { createClient } from "@/lib/supabase/server";
import {
  resolveCategorySlugByProductId,
  resolveVariantOwners,
} from "@/lib/voucher-scope";
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
    const variantIds = (url.searchParams.get("variant_ids") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const shippingMethodId = url.searchParams.get("shipping_method_id") ?? "";

    // Kit component variants belong to a different product than the cart
    // line's product_id — include those owning products in the scope pool.
    const variantOwners = await resolveVariantOwners(supabase, variantIds);
    const scopeProductIds = [
      ...new Set([...productIds, ...variantOwners.values()]),
    ];

    // Resolve product → category slug for the scope pool
    const categorySlugByProductId = await resolveCategorySlugByProductId(
      supabase,
      scopeProductIds
    );

    // Structural items (no pricing here; manual apply recomputes amounts)
    const items: ResolvedItem[] = scopeProductIds.map((id) => ({
      product_id: id,
      quantity: 1,
      unit_price: 0,
      category_slug: categorySlugByProductId.get(id) ?? null,
    }));

    const now = new Date();

    // start_at/end_at are nullable — NULL = open-ended, so skip the date check.
    const { data: raw, error } = await supabase
      .from("vouchers")
      .select("*")
      .eq("status", "active")
      .is("deleted_at", null)
      .or(`start_at.is.null,start_at.lte.${now.toISOString()}`)
      .or(`end_at.is.null,end_at.gte.${now.toISOString()}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/vouchers/eligible] error:", error);
      return NextResponse.json(
        { error: "Failed to fetch vouchers" },
        { status: 500 }
      );
    }

    const allVouchers = (raw ?? []) as unknown as VoucherRow[];
    // Filter auto_apply after fetch (auto_apply not in DB types until migration applied)
    const autoApplyVouchers = allVouchers.filter((v: any) => v.auto_apply === true);

    // ── Pre-filter: skip vouchers that hit total usage limit ──────────
    const maybeEligible = autoApplyVouchers.filter((v) => {
      if (v.usage_limit_total !== null && v.usage_limit_total > 0 && v.used_count >= v.usage_limit_total) {
        return false; // voucher exhausted globally
      }
      return true;
    });

    // ── Batch-fetch per-user usage for vouchers with per-user limits ──
    const perUserLimitVoucherIds = maybeEligible
      .filter((v) => v.usage_limit_per_user !== null && v.usage_limit_per_user > 0)
      .map((v) => v.id);

    const userUsageMap = new Map<string, number>();
    if (perUserLimitVoucherIds.length > 0) {
      const { data: usageRows } = await supabase
        .from("orders")
        .select("voucher_id")
        .eq("user_id", user.id)
        .not("voucher_id", "is", null)
        .in("voucher_id", perUserLimitVoucherIds);

      for (const row of usageRows ?? []) {
        if (!row.voucher_id) continue;
        userUsageMap.set(
          row.voucher_id,
          (userUsageMap.get(row.voucher_id) ?? 0) + 1
        );
      }
    }

    const eligible: VoucherRow[] = [];

    for (const v of maybeEligible) {
      // Check per-user usage limit
      const perUserLimit = v.usage_limit_per_user;
      if (perUserLimit !== null && perUserLimit > 0) {
        const userUsage = userUsageMap.get(v.id) ?? 0;
        if (userUsage >= perUserLimit) continue;
      }
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

    // Sort by discount amount (highest first) so auto-apply picks best voucher
    eligible.sort((a, b) => {
      const aDiscount =
        a.reward_type === 'amount_off'
          ? Number(a.amount_off ?? 0)
          : a.reward_type === 'percent_off'
            ? Number(a.percent_off ?? 0)  // percent as rough sort key
            : 0;
      const bDiscount =
        b.reward_type === 'amount_off'
          ? Number(b.amount_off ?? 0)
          : b.reward_type === 'percent_off'
            ? Number(b.percent_off ?? 0)
            : 0;
      return bDiscount - aDiscount;
    });

    return NextResponse.json({
      vouchers: eligible,
      categorySlugByProductId: Object.fromEntries(
        [...categorySlugByProductId].filter(([, slug]) => slug != null)
      ),
      ownedProductIds: scopeProductIds,
    });
  } catch (err) {
    console.error("[GET /api/vouchers/eligible] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}