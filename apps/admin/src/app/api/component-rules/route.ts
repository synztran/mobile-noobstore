import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface ComponentVariantRulePayload {
  kit_product_id: string;
  condition_variant_id: string;
  target_component_product_id: string;
  allowed_variant_ids: string[];
  /**
   * Optional per-pairing price overrides, keyed by the allowed component
   * `variant_id`. The value is the ADDITIVE contribution of that component to
   * the kit line under this rule — NOT an absolute price. Omit or null to fall
   * back to the component variant's own `price_adjustment`. `0` is a real
   * override meaning the component is free in this pairing.
   */
  price_overrides?: Record<string, number | null>;
}

export interface ComponentVariantRuleRow {
  id: string;
  kit_product_id: string;
  condition_variant_id: string;
  target_component_product_id: string;
  allowed_variant_ids: string[];
  price_overrides: Record<string, number | null>;
}

/**
 * GET /api/component-rules?kitProductId=<uuid>
 * Returns all rules (with allowed variant IDs) for the given kit product.
 */
export async function GET(req: NextRequest) {
  const kitProductId = req.nextUrl.searchParams.get("kitProductId")?.trim();
  if (!kitProductId) {
    return NextResponse.json(
      { error: "kitProductId is required" },
      { status: 400 }
    );
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("component_variant_rules")
    .select(
      `id, kit_product_id, condition_variant_id, target_component_product_id,
			 component_variant_rule_allowed(variant_id, price_override)`
    )
    .eq("kit_product_id", kitProductId)
    .order("created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rules: ComponentVariantRuleRow[] = (data ?? []).map((r: any) => ({
    id: r.id,
    kit_product_id: r.kit_product_id,
    condition_variant_id: r.condition_variant_id,
    target_component_product_id: r.target_component_product_id,
    allowed_variant_ids: (r.component_variant_rule_allowed ?? []).map(
      (a: { variant_id: string }) => a.variant_id
    ),
    price_overrides: Object.fromEntries(
      (r.component_variant_rule_allowed ?? []).map(
        (a: { variant_id: string; price_override: number | string | null }) => [
          a.variant_id,
          a.price_override === null || a.price_override === undefined
            ? null
            : Number(a.price_override),
        ]
      )
    ),
  }));

  return NextResponse.json(rules);
}

/**
 * POST /api/component-rules
 * Body: ComponentVariantRulePayload
 * Creates a rule and its allowed variant rows in a transaction.
 */
export async function POST(req: NextRequest) {
  let body: ComponentVariantRulePayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    kit_product_id,
    condition_variant_id,
    target_component_product_id,
    allowed_variant_ids,
    price_overrides,
  } = body;

  if (
    !kit_product_id ||
    !condition_variant_id ||
    !target_component_product_id
  ) {
    return NextResponse.json(
      {
        error:
          "kit_product_id, condition_variant_id and target_component_product_id are required",
      },
      { status: 400 }
    );
  }
  if (!Array.isArray(allowed_variant_ids) || allowed_variant_ids.length === 0) {
    return NextResponse.json(
      { error: "allowed_variant_ids must be a non-empty array" },
      { status: 400 }
    );
  }

  const supabase = getAdminClient();
  const ruleId = crypto.randomUUID();

  const { error: ruleError } = await supabase
    .from("component_variant_rules")
    .insert({
      id: ruleId,
      kit_product_id,
      condition_variant_id,
      target_component_product_id,
    });

  if (ruleError) {
    return NextResponse.json({ error: ruleError.message }, { status: 400 });
  }

  // Only keep overrides for variants that are actually allowed on this rule,
  // and normalise blank input to NULL so "unset" is distinguishable from 0.
  const allowedRows = allowed_variant_ids.map((variant_id) => {
    const raw = price_overrides?.[variant_id];
    const value =
      raw === undefined || raw === null || Number.isNaN(Number(raw))
        ? null
        : Number(raw);
    return { rule_id: ruleId, variant_id, price_override: value };
  });
  const { error: allowedError } = await supabase
    .from("component_variant_rule_allowed")
    .insert(allowedRows);

  if (allowedError) {
    // Rollback the rule
    await supabase.from("component_variant_rules").delete().eq("id", ruleId);
    return NextResponse.json({ error: allowedError.message }, { status: 400 });
  }

  try {
    const { invalidateProductCaches } = await import("@/lib/redis/cache");
    await invalidateProductCaches();
  } catch (err) {
    console.error(
      "[admin/component-rules/POST] cache invalidation failed:",
      err
    );
  }

  return NextResponse.json({ id: ruleId }, { status: 201 });
}

/**
 * PATCH /api/component-rules
 * Body: { ruleId, price_overrides }
 * Updates the per-pairing price override on an existing rule's allowed rows.
 * A key with a null value clears the override (back to the component's own
 * price_adjustment); omitting a key leaves that row untouched.
 */
export async function PATCH(req: NextRequest) {
  let body: {
    ruleId?: string;
    price_overrides?: Record<string, number | null>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { ruleId, price_overrides: priceOverrides } = body;
  if (!ruleId) {
    return NextResponse.json({ error: "ruleId is required" }, { status: 400 });
  }
  if (!priceOverrides || typeof priceOverrides !== "object") {
    return NextResponse.json(
      { error: "price_overrides is required" },
      { status: 400 }
    );
  }

  const supabase = getAdminClient();

  // Confirm the rule exists before writing, so a typo returns 404 instead of
  // silently succeeding against zero rows.
  const { data: rule, error: ruleLookupError } = await supabase
    .from("component_variant_rules")
    .select("id")
    .eq("id", ruleId)
    .maybeSingle();
  if (ruleLookupError) {
    return NextResponse.json(
      { error: ruleLookupError.message },
      { status: 500 }
    );
  }
  if (!rule) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  const { data: allowedRows, error: allowedError } = await supabase
    .from("component_variant_rule_allowed")
    .select("variant_id")
    .eq("rule_id", ruleId);
  if (allowedError) {
    return NextResponse.json({ error: allowedError.message }, { status: 500 });
  }

  const allowedIds = new Set(
    (allowedRows ?? []).map((r) => r.variant_id as string)
  );
  for (const [variantId, raw] of Object.entries(priceOverrides)) {
    if (!allowedIds.has(variantId)) continue;
    const value =
      raw === null || raw === undefined || Number.isNaN(Number(raw))
        ? null
        : Number(raw);
    const { error } = await supabase
      .from("component_variant_rule_allowed")
      .update({ price_override: value })
      .eq("rule_id", ruleId)
      .eq("variant_id", variantId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  try {
    const { invalidateProductCaches } = await import("@/lib/redis/cache");
    await invalidateProductCaches();
  } catch (err) {
    console.error(
      "[admin/component-rules/PATCH] cache invalidation failed:",
      err
    );
  }

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/component-rules?ruleId=<uuid>
 * Deletes the rule (cascade removes allowed variant rows via FK).
 */
export async function DELETE(req: NextRequest) {
  const ruleId = req.nextUrl.searchParams.get("ruleId")?.trim();
  if (!ruleId) {
    return NextResponse.json({ error: "ruleId is required" }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { error } = await supabase
    .from("component_variant_rules")
    .delete()
    .eq("id", ruleId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    const { invalidateProductCaches } = await import("@/lib/redis/cache");
    await invalidateProductCaches();
  } catch (err) {
    console.error(
      "[admin/component-rules/DELETE] cache invalidation failed:",
      err
    );
  }

  return NextResponse.json({ success: true });
}
