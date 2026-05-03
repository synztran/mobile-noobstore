/**
 * Pre-order domain types for NoobStore.
 *
 * Pre-order is modelled at the VARIANT level: a single product can have
 * some variants in stock (ready to ship) and other variants on pre-order.
 *
 * DB layout:
 *   product_variants.is_pre_order     — source of truth (boolean)
 *   product_variants.pre_order_config — JSONB, required when is_pre_order=true
 *   products.is_pre_order             — denormalized flag (true if any variant
 *                                       is pre-order), kept in sync by DB trigger.
 *                                       Used for fast shop-page filtering.
 *
 * NEVER import this file in server components — use the auto-generated
 * database.types.ts for raw DB types and cast via parsePreOrderConfig().
 */

// ─── Raw JSONB shape stored in the database ──────────────────────────────────

export interface PreOrderConfig {
	/** Human-readable delivery estimate shown to the customer, e.g. "2–3 tuần" */
	estimate: string;
	/** ISO-8601 date string when stock is expected to arrive, e.g. "2026-07-01" */
	available_date?: string;
	/** Optional customer-facing note, e.g. "Hàng đặt trước — thanh toán trước 100%" */
	notes?: string;
}

// ─── Resolved variant pre-order info used in UI components ───────────────────

export type VariantPreOrderInfo =
	| { is_pre_order: false }
	| { is_pre_order: true; config: PreOrderConfig };

// ─── Parser / validator ───────────────────────────────────────────────────────

/**
 * Parse and type-check a raw `pre_order_config` JSONB value from the database.
 * Returns `null` if the value is missing, not an object, or missing required fields.
 *
 * Usage:
 *   const config = parsePreOrderConfig(variant.pre_order_config);
 *   if (config) { ... }
 */
export function parsePreOrderConfig(raw: unknown): PreOrderConfig | null {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

	const obj = raw as Record<string, unknown>;

	if (typeof obj.estimate !== "string" || !obj.estimate.trim()) return null;

	return {
		estimate: obj.estimate.trim(),
		available_date:
			typeof obj.available_date === "string" && obj.available_date.trim()
				? obj.available_date.trim()
				: undefined,
		notes:
			typeof obj.notes === "string" && obj.notes.trim()
				? obj.notes.trim()
				: undefined,
	};
}

/**
 * Resolve a variant's pre-order info from raw DB fields.
 * Returns a discriminated union for easy conditional rendering.
 */
export function resolveVariantPreOrder(
	is_pre_order: boolean,
	pre_order_config: unknown,
): VariantPreOrderInfo {
	if (!is_pre_order) return { is_pre_order: false };

	const config = parsePreOrderConfig(pre_order_config);
	if (!config) return { is_pre_order: false }; // malformed config → treat as in-stock

	return { is_pre_order: true, config };
}
