/**
 * scripts/backfill_product_type.ts
 *
 * One-time script to backfill products.product_type based on product_components
 * relationships:
 *   - parent_product_id  → product_type = 'kit'
 *   - component_product_id → product_type = 'component'
 *   - everything else remains 'standard'
 *
 * Usage:
 *   npx tsx scripts/backfill_product_type.ts
 *
 * Requires .env.local (or .env) with:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 */

/// <reference types="node" />
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local (or .env) from the workspace root if not already set
const envFiles = [".env.local", ".env"];
for (const file of envFiles) {
	const envPath = resolve(process.cwd(), file);
	if (existsSync(envPath)) {
		for (const line of readFileSync(envPath, "utf-8").split("\n")) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) continue;
			const eq = trimmed.indexOf("=");
			if (eq === -1) continue;
			const key = trimmed.slice(0, eq).trim();
			const val = trimmed
				.slice(eq + 1)
				.trim()
				.replace(/^["']|["']$/g, "");
			if (!(key in process.env)) process.env[key] = val;
		}
		console.log(`ℹ Loaded env from ${file}`);
		break;
	}
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
	console.error(
		"❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
	);
	process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
	auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
	// ── 1. Backfill kits ──────────────────────────────────────────────────
	const { data: kitRows, error: kitFetchError } = await supabase
		.from("product_components")
		.select("parent_product_id")
		.not("parent_product_id", "is", null);

	if (kitFetchError) throw kitFetchError;

	const kitIds = [
		...new Set(
			(kitRows ?? []).map(
				(r: { parent_product_id: string }) => r.parent_product_id,
			),
		),
	];

	if (kitIds.length > 0) {
		const { error } = await supabase
			.from("products")
			.update({ product_type: "kit" })
			.in("id", kitIds);
		if (error) throw error;
		console.log(`✔ Marked ${kitIds.length} product(s) as 'kit'`);
	} else {
		console.log("ℹ No kit products found");
	}

	// ── 2. Backfill components ────────────────────────────────────────────
	const { data: componentRows, error: compFetchError } = await supabase
		.from("product_components")
		.select("component_product_id")
		.not("component_product_id", "is", null);

	if (compFetchError) throw compFetchError;

	const componentIds = [
		...new Set(
			(componentRows ?? []).map(
				(r: { component_product_id: string }) => r.component_product_id,
			),
		),
	];

	if (componentIds.length > 0) {
		// Only downgrade to 'component' if not already classified as 'kit'
		const { error } = await supabase
			.from("products")
			.update({ product_type: "component" })
			.in("id", componentIds)
			.eq("product_type", "standard");
		if (error) throw error;
		console.log(
			`✔ Marked ${componentIds.length} product(s) as 'component'`,
		);
	} else {
		console.log("ℹ No component products found");
	}

	console.log("✅ Backfill complete. Remaining products stay as 'standard'.");
}

main().catch((e) => {
	console.error("❌ Backfill failed:", e);
	process.exit(1);
});
