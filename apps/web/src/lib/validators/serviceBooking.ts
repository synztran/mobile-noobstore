import type { BookingService } from "@/app/api/services/booking-config/route";
import {
	getStabilizerTotal,
	type ServiceEntryDraft,
} from "@/components/services/ServiceSectionCard";

export type ValidationResult = {
	globalError?: string;
	entryErrors: Record<string, Record<string, string>>;
};

export function validateSelections(
	servicesById: Record<string, BookingService>,
	selections: Record<string, ServiceEntryDraft[]>,
	pickupAt: string,
): ValidationResult {
	const entryErrors: Record<string, Record<string, string>> = {};

	const allEntries = Object.values(selections).flat();
	if (allEntries.length === 0) {
		return { globalError: "Bạn cần chọn ít nhất một mục dịch vụ.", entryErrors };
	}

	for (const [serviceId, entries] of Object.entries(selections)) {
		const service = servicesById[serviceId];
		if (!service) continue;

		for (const entry of entries) {
			let error: string | null = null;

			// Stabilizer: must have at least one stabilizer selected
			if (service.service_section === "stabilizer") {
				const total = getStabilizerTotal(entry);
				if (total === 0) {
					error = "Vui lòng chọn ít nhất một size stabilizer.";
				}
			}
			// Lubricant: must have switch count >= 1
			if (!error && service.service_section === "lubricant") {
				if (!entry.switchCount || entry.switchCount < 1) {
					error = "Vui lòng nhập số lượng switch.";
				}
			}
			// Switch section: qty required; lube service also requires type/status
			if (!error && service.service_section === "switch") {
				if (!entry.switchCount || entry.switchCount < 1) {
					error = "Vui lòng nhập số lượng switch.";
				} else if (service.id === "svc-switch-lube") {
					if (!entry.switchType) {
						error = "Vui lòng chọn loại switch.";
					} else if (!entry.switchStatus) {
						error = "Vui lòng chọn tình trạng switch.";
					}
				}
			}
			// Cleaning: must have product type and sub-selections
			if (!error && service.service_section === "cleaning") {
				if (!entry.cleaningProductType) {
					error = "Vui lòng chọn loại sản phẩm cần vệ sinh.";
				} else if (entry.cleaningProductType === "keyboard" && !entry.cleaningLayout) {
					error = "Vui lòng chọn layout bàn phím.";
				} else if (entry.cleaningProductType === "keycap" && (!entry.cleaningKeycapQty || entry.cleaningKeycapQty < 1)) {
					error = "Vui lòng nhập số lượng keycap.";
				} else if (entry.cleaningProductType === "switch") {
					if (!entry.cleaningSwitchBundle) {
						error = "Vui lòng chọn bundle vệ sinh switch.";
					} else if (!entry.cleaningSwitchStatus) {
						error = "Vui lòng chọn tình trạng switch.";
					}
				}
			}
			// Repair: must describe the issue
			if (!error && service.service_section === "repair") {
				if (!entry.repairIssue || entry.repairIssue.trim().length < 10) {
					error = "Vui lòng mô tả lỗi bàn phím (tối thiểu 10 ký tự).";
				}
			}
			// Required options
			if (!error) {
				for (const option of service.options) {
					if (!option.is_required) continue;
					if (!entry.selectedByOptionId[String(option.id)]) {
						error = `Còn thiếu lựa chọn: ${option.label}.`;
						break;
					}
				}
			}

			if (error) {
				if (!entryErrors[serviceId]) entryErrors[serviceId] = {};
				entryErrors[serviceId][entry.entryId] = error;
			}
		}
	}

	return { entryErrors };
}
