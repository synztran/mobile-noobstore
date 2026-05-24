import type { BookingService } from "@/app/api/services/booking-config/route";
import {
	getStabilizerTotal,
	type ServiceEntryDraft,
} from "@/components/services/ServiceSectionCard";

export type SectionHandlerResult = {
	quantity: number;
	noteParts: string[];
};

export type SectionHandler = (
	entry: ServiceEntryDraft,
	service: BookingService,
) => SectionHandlerResult;

const stabilizerHandler: SectionHandler = (entry) => {
	const quantity = getStabilizerTotal(entry);
	const noteParts: string[] = [];

	if (entry.stabilizerType) {
		noteParts.push(
			entry.stabilizerType === "clip-in"
				? "Clip-in (ngàm)"
				: "Screw-in (ốc)",
		);
	}
	if (entry.stabilizerMode === "bundle" && entry.stabilizerBundle) {
		noteParts.push(
			entry.stabilizerBundle === "6.25u"
				? "Bundle 6.25u (4× 2u + 1× 6.25u)"
				: "Bundle 7u (4× 2u + 1× 7u)",
		);
	} else if (entry.stabilizerMode === "individual") {
		const parts = Object.entries(entry.stabilizerQuantities ?? {})
			.filter(([, qty]) => qty > 0)
			.map(([size, qty]) => `${qty}× ${size}`);
		if (parts.length > 0) noteParts.push(parts.join(", "));
	}

	return { quantity, noteParts };
};

const lubricantHandler: SectionHandler = (entry) => ({
	quantity: entry.switchCount ?? 1,
	noteParts: [],
});

const switchHandler: SectionHandler = (entry, service) => {
	const quantity = entry.switchCount ?? 1;
	const noteParts: string[] = [];

	if (service.id === "svc-switch-lube") {
		const typeLabels: Record<string, string> = {
			linear: "Linear",
			tactile: "Tactile",
		};
		const statusLabels: Record<string, string> = {
			"new-unlube": "Mới, chưa lube",
			"new-factory-lube": "Mới, factory pre-lube",
			"used-lubed": "Đã qua dùng, đã lube",
		};
		if (entry.switchType)
			noteParts.push(typeLabels[entry.switchType] ?? entry.switchType);
		if (entry.switchStatus)
			noteParts.push(
				statusLabels[entry.switchStatus] ?? entry.switchStatus,
			);
	}

	return { quantity, noteParts };
};

const cleaningHandler: SectionHandler = (entry) => {
	let quantity = 1;
	const noteParts: string[] = [];

	if (entry.cleaningProductType === "keyboard") {
		noteParts.push(`Bàn phím ${entry.cleaningLayout ?? ""}`);
	} else if (entry.cleaningProductType === "keycap") {
		quantity = entry.cleaningKeycapQty ?? 1;
		noteParts.push(`Keycap × ${quantity}`);
	} else if (entry.cleaningProductType === "switch") {
		quantity = entry.cleaningSwitchQty ?? 1;
		noteParts.push(
			`Switch × ${quantity} | Bundle ${entry.cleaningSwitchBundle ?? ""} | ${entry.cleaningSwitchStatus ?? ""}`,
		);
	}

	return { quantity, noteParts };
};

const defaultHandler: SectionHandler = () => ({ quantity: 1, noteParts: [] });

const keycapStemHandler: SectionHandler = (entry) => {
	const groups = entry.keycapStemGroups ?? [{ unit: "1u", quantity: 1 }];
	const quantity = groups.reduce((acc, g) => acc + g.quantity, 0);
	const noteParts = groups
		.filter((g) => g.quantity > 0)
		.map((g) => `${g.quantity}× ${g.unit}`);
	return { quantity, noteParts };
};

export const sectionHandlers: Record<string, SectionHandler> = {
	stabilizer: stabilizerHandler,
	lubricant: lubricantHandler,
	switch: switchHandler,
	cleaning: cleaningHandler,
	keycap_stem: keycapStemHandler,
};

export function resolveSectionEntry(
	entry: ServiceEntryDraft,
	service: BookingService,
): SectionHandlerResult {
	const handler = sectionHandlers[service.service_section] ?? defaultHandler;
	return handler(entry, service);
}
