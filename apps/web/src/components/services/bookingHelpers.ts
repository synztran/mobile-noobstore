import type { BookingService } from "@/app/api/services/booking-config/route";
import type { ServiceEntryDraft } from "./types";

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

export function computeCleaningPrice(entry: ServiceEntryDraft): number {
	if (entry.cleaningProductType === "keyboard") {
		return CLEANING_KEYBOARD_PRICES[entry.cleaningLayout ?? ""] ?? 0;
	}
	if (entry.cleaningProductType === "keycap") {
		const qty = entry.cleaningKeycapQty ?? 0;
		if (qty < 50) return 50_000;
		if (qty <= 150) return 100_000;
		return 150_000;
	}
	if (entry.cleaningProductType === "switch") {
		const b = CLEANING_SWITCH_BUNDLES.find(
			(b) => b.count === entry.cleaningSwitchBundle,
		);
		return b?.price ?? 0;
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

export function computeSwitchLubePrice(entry: ServiceEntryDraft): number {
	const count = entry.switchCount ?? 0;
	if (count === 0 || !entry.switchType) return 0;
	const typeOpt = SWITCH_TYPE_OPTIONS.find(
		(o) => o.type === entry.switchType,
	);
	const statusOpt = SWITCH_STATUS_OPTIONS.find(
		(o) => o.status === entry.switchStatus,
	);
	const perSwitch =
		(typeOpt?.pricePerUnit ?? 3_000) + (statusOpt?.adjustment ?? 0);
	return count * perSwitch;
}

// ─── Keycap stem ─────────────────────────────────────────────────────────────

export const KEYCAP_STEM_UNIT_PRICES: Record<string, number> = {
	"1u": 50_000,
	"2u": 80_000,
};

export function computeKeycapStemPrice(entry: ServiceEntryDraft): number {
	return (entry.keycapStemGroups ?? [{ unit: "1u", quantity: 1 }]).reduce(
		(acc, g) => acc + (KEYCAP_STEM_UNIT_PRICES[g.unit] ?? 0) * g.quantity,
		0,
	);
}

// ─── Entry price preview ──────────────────────────────────────────────────────

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
): number | null {
	const section = service.service_section;
	if (section === "cleaning") return computeCleaningPrice(entry);
	if (section === "keycap_stem") return computeKeycapStemPrice(entry);
	if (section === "switch" && service.id === "svc-switch-lube") return null;
	if (section === "switch")
		return service.base_price * (entry.switchCount ?? 1);
	if (section === "lubricant" || section === "stabilizer")
		return service.base_price + computeOptionAdjustment(service, entry);
	return null;
}
