import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface ComponentVariantRulePayload {
	kit_product_id: string;
	condition_variant_id: string;
	target_component_product_id: string;
	allowed_variant_ids: string[];
}

export interface ComponentVariantRuleRow {
	id: string;
	kit_product_id: string;
	condition_variant_id: string;
	target_component_product_id: string;
	allowed_variant_ids: string[];
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
			{ status: 400 },
		);
	}

	const supabase = getAdminClient();
	const { data, error } = await supabase
		.from("component_variant_rules")
		.select(
			`id, kit_product_id, condition_variant_id, target_component_product_id,
			 component_variant_rule_allowed(variant_id)`,
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
			(a: { variant_id: string }) => a.variant_id,
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
	} = body;

	if (
		!kit_product_id ||
		!condition_variant_id ||
		!target_component_product_id
	) {
		return NextResponse.json(
			{
				error: "kit_product_id, condition_variant_id and target_component_product_id are required",
			},
			{ status: 400 },
		);
	}
	if (
		!Array.isArray(allowed_variant_ids) ||
		allowed_variant_ids.length === 0
	) {
		return NextResponse.json(
			{ error: "allowed_variant_ids must be a non-empty array" },
			{ status: 400 },
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

	const allowedRows = allowed_variant_ids.map((variant_id) => ({
		rule_id: ruleId,
		variant_id,
	}));
	const { error: allowedError } = await supabase
		.from("component_variant_rule_allowed")
		.insert(allowedRows);

	if (allowedError) {
		// Rollback the rule
		await supabase
			.from("component_variant_rules")
			.delete()
			.eq("id", ruleId);
		return NextResponse.json(
			{ error: allowedError.message },
			{ status: 400 },
		);
	}

	return NextResponse.json({ id: ruleId }, { status: 201 });
}

/**
 * DELETE /api/component-rules?ruleId=<uuid>
 * Deletes the rule (cascade removes allowed variant rows via FK).
 */
export async function DELETE(req: NextRequest) {
	const ruleId = req.nextUrl.searchParams.get("ruleId")?.trim();
	if (!ruleId) {
		return NextResponse.json(
			{ error: "ruleId is required" },
			{ status: 400 },
		);
	}

	const supabase = getAdminClient();
	const { error } = await supabase
		.from("component_variant_rules")
		.delete()
		.eq("id", ruleId);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json({ success: true });
}
