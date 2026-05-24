import type { BookingService } from "@/app/api/services/booking-config/route";
import {
	getStabilizerTotal,
	type ServiceEntryDraft,
} from "@/components/services/ServiceSectionCard";

export function validateSelections(
	servicesById: Record<string, BookingService>,
	selections: Record<string, ServiceEntryDraft[]>,
	pickupAt: string,
): string | null {
	// if (!pickupAt) {
	// 	return "Vui lòng chọn thời gian nhận dịch vụ.";
	// }

	const allEntries = Object.values(selections).flat();
	if (allEntries.length === 0) {
		return "Bạn cần chọn ít nhất một mục dịch vụ.";
	}

	for (const [serviceId, entries] of Object.entries(selections)) {
		const service = servicesById[serviceId];
		if (!service) continue;

		for (const entry of entries) {
			// Stabilizer: must have at least one stabilizer selected
			if (service.service_section === "stabilizer") {
				const total = getStabilizerTotal(entry);
				if (total === 0) {
					return `Dịch vụ ${service.name}: vui lòng chọn ít nhất một size stabilizer.`;
				}
			}
			// Lubricant: must have switch count >= 1
			if (service.service_section === "lubricant") {
				if (!entry.switchCount || entry.switchCount < 1) {
					return `Dịch vụ ${service.name}: vui lòng nhập số lượng switch.`;
				}
			}
			// Switch section: qty required; lube service also requires type/status
			if (service.service_section === "switch") {
				if (!entry.switchCount || entry.switchCount < 1) {
					return `Dịch vụ ${service.name}: vui lòng nhập số lượng switch.`;
				}
				if (service.id === "svc-switch-lube") {
					if (!entry.switchType) {
						return `Dịch vụ ${service.name}: vui lòng chọn loại switch.`;
					}
					if (!entry.switchStatus) {
						return `Dịch vụ ${service.name}: vui lòng chọn tình trạng switch.`;
					}
				}
			}
			// Cleaning: must have product type and sub-selections
			if (service.service_section === "cleaning") {
				if (!entry.cleaningProductType) {
					return `Dịch vụ ${service.name}: vui lòng chọn loại sản phẩm cần vệ sinh.`;
				}
				if (
					entry.cleaningProductType === "keyboard" &&
					!entry.cleaningLayout
				) {
					return `Dịch vụ ${service.name}: vui lòng chọn layout bàn phím.`;
				}
				if (
					entry.cleaningProductType === "keycap" &&
					(!entry.cleaningKeycapQty || entry.cleaningKeycapQty < 1)
				) {
					return `Dịch vụ ${service.name}: vui lòng nhập số lượng keycap.`;
				}
				if (entry.cleaningProductType === "switch") {
					if (!entry.cleaningSwitchBundle) {
						return `Dịch vụ ${service.name}: vui lòng chọn bundle vệ sinh switch.`;
					}
					if (!entry.cleaningSwitchStatus) {
						return `Dịch vụ ${service.name}: vui lòng chọn tình trạng switch.`;
					}
				}
			}
			for (const option of service.options) {
				if (!option.is_required) continue;
				if (!entry.selectedByOptionId[String(option.id)]) {
					return `Dịch vụ ${service.name} còn thiếu lựa chọn: ${option.label}.`;
				}
			}
		}
	}

	return null;
}
