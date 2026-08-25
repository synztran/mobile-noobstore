import type { BookingService } from "@/app/api/services/booking-config/route";
import type { ServicePricingRule } from "@/types/service-pricing";
import type { ServiceEntryDraft } from "./types";

// ─── Pricing maps ──────────────────────────────────────────────────────────
// Convert flat ServicePricingRule[] into typed lookup maps for efficient
// access during price computation.

export interface PricingMaps {
	cleaningKeyboard: Record<string, { price: number; handlingDays: number }>;
	cleaningKeycap: { maxQty: number | null; price: number; handlingDays: number }[];
	cleaningSwitchBundle: Record<string, { price: number; handlingDays: number }>;
	switchLubeType: Record<string, { label: string; pricePerUnit: number; handlingDays: number }>;
	switchLubeStatus: Record<string, { label: string; adjustment: number; handlingDays: number }>;
	keycapStem: Record<string, { price: number; handlingDays: number }>;
}

const KEYCAP_TIER_LABELS: Record<string, "small" | "medium" | "large"> = {
	small: "small",
	medium: "medium",
	large: "large",
};

export function buildPricingMaps(rules: ServicePricingRule[]): PricingMaps {
	const maps: PricingMaps = {
		cleaningKeyboard: {},
		cleaningKeycap: [],
		cleaningSwitchBundle: {},
		switchLubeType: {},
		switchLubeStatus: {},
		keycapStem: {},
	};

	for (const rule of rules) {
		switch (rule.service_type) {
			case "cleaning_keyboard":
				maps.cleaningKeyboard[rule.key] = {
					price: rule.price,
					handlingDays: rule.handling_days,
				};
				break;
			case "cleaning_keycap": {
				const meta = rule.metadata as { max_qty?: number | null };
				maps.cleaningKeycap.push({
					maxQty: meta?.max_qty ?? null,
					price: rule.price,
					handlingDays: rule.handling_days,
				});
				maps.cleaningKeycap.sort(
					(a, b) => (a.maxQty ?? Infinity) - (b.maxQty ?? Infinity),
				);
				break;
			}
			case "cleaning_switch_bundle":
				maps.cleaningSwitchBundle[rule.key] = {
					price: rule.price,
					handlingDays: rule.handling_days,
				};
				break;
			case "switch_lube_type":
				maps.switchLubeType[rule.key] = {
					label: rule.label,
					pricePerUnit: rule.price,
					handlingDays: rule.handling_days,
				};
				break;
			case "switch_lube_status":
				maps.switchLubeStatus[rule.key] = {
					label: rule.label,
					adjustment: rule.price,
					handlingDays: rule.handling_days,
				};
				break;
			case "keycap_stem":
				maps.keycapStem[rule.key] = {
					price: rule.price,
					handlingDays: rule.handling_days,
				};
				break;
		}
	}

	return maps;
}

// ─── Fallback pricing maps (hardcoded) ─────────────────────────────────────
// Used when the API hasn't loaded pricing data yet.

const FALLBACK_PRICING_MAPS: PricingMaps = {
	cleaningKeyboard: {
		"60%": { price: 80_000, handlingDays: 2 },
		"65%": { price: 80_000, handlingDays: 2 },
		"75%": { price: 100_000, handlingDays: 3 },
		TKL: { price: 120_000, handlingDays: 3 },
		"100%": { price: 150_000, handlingDays: 4 },
	},
	cleaningKeycap: [
		{ maxQty: 49, price: 50_000, handlingDays: 1 },
		{ maxQty: 150, price: 100_000, handlingDays: 2 },
		{ maxQty: null, price: 150_000, handlingDays: 3 },
	],
	cleaningSwitchBundle: {
		"60": { price: 60_000, handlingDays: 1 },
		"90": { price: 80_000, handlingDays: 2 },
		"110": { price: 100_000, handlingDays: 2 },
		"150": { price: 130_000, handlingDays: 3 },
	},
	switchLubeType: {
		linear: { label: "Linear", pricePerUnit: 3_000, handlingDays: 2 },
		tactile: { label: "Tactile", pricePerUnit: 3_500, handlingDays: 3 },
	},
	switchLubeStatus: {
		"new-unlube": { label: "Mới, chưa lube", adjustment: 0, handlingDays: 0 },
		"new-factory-lube": {
			label: "Mới, factory pre-lube",
			adjustment: -500,
			handlingDays: 0,
		},
		"used-lubed": { label: "Đã qua dùng, đã lube", adjustment: 500, handlingDays: 1 },
	},
	keycapStem: {
		"1u": { price: 50_000, handlingDays: 1 },
		"2u": { price: 80_000, handlingDays: 2 },
	},
};

let _cachedPricingMaps: PricingMaps | null = null;

function getPricingMaps(): PricingMaps {
	return _cachedPricingMaps ?? FALLBACK_PRICING_MAPS;
}

export function setPricingMaps(maps: PricingMaps): void {
	_cachedPricingMaps = maps;
}

export function resetPricingMaps(): void {
	_cachedPricingMaps = null;
}

export function usePricingMaps(): PricingMaps {
	return getPricingMaps();
}

// ─── Stabilizer ──────────────────────────────────────────────────────────────

export const STABILIZER_SIZES = ["2u", "6.25u", "7u"] as const;
export type StabilizerSize = (typeof STABILIZER_SIZES)[number];

export const STABILIZER_TYPES: {
	type: "clip-in" | "screw-in";
	label: string;
	detail: string;
}[] = [
	{ type: "clip-in", label: "Clip-in", detail: "Dùng ngàm cố định" },
	{ type: "screw-in", label: "Screw-in", detail: "Dùng ốc cố định" },
];

export const STABILIZER_BUNDLES: Record<
	"6.25u" | "7u",
	{
		label: string;
		detail: string;
		sizes: Partial<Record<StabilizerSize, number>>;
	}
> = {
	"6.25u": {
		label: "Bundle 6.25u",
		detail: "4×2u + 1×6.25u",
		sizes: { "2u": 4, "6.25u": 1 },
	},
	"7u": {
		label: "Bundle 7u",
		detail: "4×2u + 1×7u",
		sizes: { "2u": 4, "7u": 1 },
	},
};

export function getStabilizerTotal(entry: ServiceEntryDraft): number {
	if (entry.stabilizerMode === "bundle" && entry.stabilizerBundle) {
		const b = STABILIZER_BUNDLES[entry.stabilizerBundle];
		return Object.values(b.sizes).reduce(
			(acc: number, v) => acc + (v ?? 0),
			0,
		);
	}
	if (entry.stabilizerMode === "individual") {
		return Object.values(entry.stabilizerQuantities ?? {}).reduce(
			(acc, v) => acc + v,
			0,
		);
	}
	return 1;
}

// ─── Cleaning ────────────────────────────────────────────────────────────────

export const CLEANING_KEYBOARD_LAYOUTS = [
	"60%",
	"65%",
	"75%",
	"TKL",
	"100%",
] as const;

// Display-only constants — kept for direct imports in UI components.
// Price computation reads from dynamic PricingMaps (DB-sourced).
export const CLEANING_KEYBOARD_PRICES: Record<string, number> = {
	"60%": 80_000,
	"65%": 80_000,
	"75%": 100_000,
	TKL: 120_000,
	"100%": 150_000,
};

export const CLEANING_SWITCH_BUNDLES = [
	{ count: 60, price: 60_000 },
	{ count: 90, price: 80_000 },
	{ count: 110, price: 100_000 },
	{ count: 150, price: 130_000 },
] as const;

export const CLEANING_SWITCH_STATUSES = [
	"Mới / Chưa lube",
	"Đã lube",
	"Bẩn / Nhiều bụi",
] as const;

export function computeCleaningPrice(
	entry: ServiceEntryDraft,
	maps?: PricingMaps,
): number {
	const m = maps ?? getPricingMaps();

	if (entry.cleaningProductType === "keyboard") {
		return m.cleaningKeyboard[entry.cleaningLayout ?? ""]?.price ?? 0;
	}
	if (entry.cleaningProductType === "keycap") {
		const qty = entry.cleaningKeycapQty ?? 0;
		for (const tier of m.cleaningKeycap) {
			if (tier.maxQty === null || qty <= tier.maxQty) {
				return tier.price;
			}
		}
		return 150_000;
	}
	if (entry.cleaningProductType === "switch") {
		return (
			m.cleaningSwitchBundle[String(entry.cleaningSwitchBundle ?? "")]?.price ??
			0
		);
	}
	return 0;
}

// ─── Switch lube ─────────────────────────────────────────────────────────────

export const SWITCH_TYPE_OPTIONS = [
	{ type: "linear" as const, label: "Linear", pricePerUnit: 3_000 },
	{ type: "tactile" as const, label: "Tactile", pricePerUnit: 3_500 },
];

export const SWITCH_STATUS_OPTIONS = [
	{ status: "new-unlube" as const, label: "Mới, chưa lube", adjustment: 0 },
	{
		status: "new-factory-lube" as const,
		label: "Mới, factory pre-lube",
		adjustment: -500,
	},
	{
		status: "used-lubed" as const,
		label: "Đã qua dùng, đã lube",
		adjustment: 500,
	},
];

export function computeSwitchLubePrice(
	entry: ServiceEntryDraft,
	maps?: PricingMaps,
): number {
	const count = entry.switchCount ?? 0;
	if (count === 0 || !entry.switchType) return 0;

	const m = maps ?? getPricingMaps();
	const typeOpt = m.switchLubeType[entry.switchType];
	const statusOpt = entry.switchStatus
		? m.switchLubeStatus[entry.switchStatus]
		: undefined;
	const perSwitch =
		(typeOpt?.pricePerUnit ?? 3_000) + (statusOpt?.adjustment ?? 0);
	return count * perSwitch;
}

export function computeSwitchLubeHandlingDays(
	entry: ServiceEntryDraft,
	maps?: PricingMaps,
): number {
	const m = maps ?? getPricingMaps();
	const typeOpt = entry.switchType
		? m.switchLubeType[entry.switchType]
		: undefined;
	const statusOpt = entry.switchStatus
		? m.switchLubeStatus[entry.switchStatus]
		: undefined;
	return (typeOpt?.handlingDays ?? 2) + (statusOpt?.handlingDays ?? 0);
}

// ─── Keycap stem ─────────────────────────────────────────────────────────────

export const KEYCAP_STEM_UNIT_PRICES: Record<string, number> = {
	"1u": 50_000,
	"2u": 80_000,
};

export function computeKeycapStemPrice(
	entry: ServiceEntryDraft,
	maps?: PricingMaps,
): number {
	const m = maps ?? getPricingMaps();
	return (entry.keycapStemGroups ?? [{ unit: "1u", quantity: 1 }]).reduce(
		(acc, g) => acc + (m.keycapStem[g.unit]?.price ?? 0) * g.quantity,
		0,
	);
}

// ─── Entry price preview ─────────────────────────────────────────────────────

export function computeOptionAdjustment(
	service: BookingService,
	entry: ServiceEntryDraft,
): number {
	return service.options.reduce((acc, opt) => {
		const vid = entry.selectedByOptionId[String(opt.id)];
		const val = opt.values.find((v) => v.id === vid);
		return acc + (val?.price_adjustment ?? 0);
	}, 0);
}

export function computeEntryPreviewPrice(
	entry: ServiceEntryDraft,
	service: BookingService,
	maps?: PricingMaps,
): number | null {
	const section = service.service_section;
	if (section === "cleaning") return computeCleaningPrice(entry, maps);
	if (section === "keycap_stem") return computeKeycapStemPrice(entry, maps);
	if (section === "switch" && service.id === "svc-switch-lube") return null;
	if (section === "switch")
		return service.base_price * (entry.switchCount ?? 1);
	return service.base_price + computeOptionAdjustment(service, entry);
}
