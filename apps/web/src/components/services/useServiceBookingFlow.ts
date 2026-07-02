"use client";

import type {
	ServiceBookingRequest,
	ServiceBookingResponse,
} from "@/app/api/service-bookings/route";
import type {
	BookingConfigResponse,
	BookingService,
} from "@/app/api/services/booking-config/route";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
	useBookingConfig,
	useServiceBookingMutation,
} from "@/lib/react-query/service/api/useServiceQueries";
import { resolveSectionEntry } from "@/lib/services/bookingSelectionHandlers";
import { validateSelections } from "@/lib/validators/serviceBooking";
import type { ServicePricingRule } from "@/types/service-pricing";
import { useMemo, useState } from "react";
import type { BookingSummaryItem } from "./ServiceBookingSummaryBar";
import {
	buildPricingMaps,
	computeCleaningPrice,
	computeKeycapStemPrice,
	computeSwitchLubePrice,
	setPricingMaps,
	type PricingMaps,
	type ServiceEntryDraft,
} from "./ServiceSectionCard";

// ─── Pure helpers ────────────────────────────────────────────────────────────

function createEntry(service: BookingService): ServiceEntryDraft {
	const selectedByOptionId: Record<string, number> = {};
	for (const option of service.options) {
		if (!option.is_required) continue;
		const firstValue = option.values[0];
		if (!firstValue) continue;
		selectedByOptionId[String(option.id)] = firstValue.id;
	}

	const entry: ServiceEntryDraft = {
		entryId: `${service.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		selectedByOptionId,
		lineNote: "",
	};

	if (service.service_section === "stabilizer") {
		entry.stabilizerMode = "bundle";
		entry.stabilizerBundle = "6.25u";
	} else if (
		service.service_section === "lubricant" ||
		service.service_section === "switch"
	) {
		entry.switchCount = 1;
	}

	return entry;
}

function getServiceOptionAdjustment(
	service: BookingService,
	selectedByOptionId: Record<string, number>,
) {
	let totalAdjustment = 0;
	for (const option of service.options) {
		const selectedValueId = selectedByOptionId[String(option.id)];
		if (!selectedValueId) continue;
		const value = option.values.find((v) => v.id === selectedValueId);
		if (!value) continue;
		totalAdjustment += value.price_adjustment;
	}
	return totalAdjustment;
}

export type BookingSummary = {
	totalPrice: number;
	totalHandlingDays: number;
	selectedCount: number;
	summaryItems: BookingSummaryItem[];
};

function computeBookingSummary(
	servicesById: Record<string, BookingService>,
	selections: Record<string, ServiceEntryDraft[]>,
	pricingMaps?: PricingMaps,
): BookingSummary {
	let totalPrice = 0;
	let totalHandlingDays = 0;
	let selectedCount = 0;
	const grouped = new Map<string, BookingSummaryItem>();

	for (const [serviceId, entries] of Object.entries(selections)) {
		const service = servicesById[serviceId];
		if (!service) continue;

		let servicePrice = 0;
		for (const entry of entries) {
			selectedCount += 1;
			totalHandlingDays += service.handling_days;

			let entryPrice = 0;
			if (service.service_section === "cleaning") {
				entryPrice = computeCleaningPrice(entry, pricingMaps);
			} else if (service.service_section === "keycap_stem") {
				entryPrice = computeKeycapStemPrice(entry, pricingMaps);
			} else if (
				service.service_section === "switch" &&
				service.id === "svc-switch-lube"
			) {
				entryPrice =
					computeSwitchLubePrice(entry, pricingMaps) +
					getServiceOptionAdjustment(
						service,
						entry.selectedByOptionId,
					) *
						(entry.switchCount ?? 1);
			} else if (service.service_section === "switch") {
				entryPrice = service.base_price * (entry.switchCount ?? 1);
			} else {
				entryPrice =
					service.base_price +
					getServiceOptionAdjustment(
						service,
						entry.selectedByOptionId,
					);
			}
			totalPrice += entryPrice;
			servicePrice += entryPrice;
		}

		const prev = grouped.get(serviceId);
		if (prev) {
			grouped.set(serviceId, {
				...prev,
				count: prev.count + entries.length,
				handlingDays:
					prev.handlingDays + service.handling_days * entries.length,
				price: prev.price + servicePrice,
			});
		} else {
			grouped.set(serviceId, {
				serviceId,
				serviceName: service.name,
				count: entries.length,
				handlingDays: service.handling_days * entries.length,
				price: servicePrice,
			});
		}
	}

	return {
		totalPrice,
		totalHandlingDays,
		selectedCount,
		summaryItems: Array.from(grouped.values()),
	};
}

function buildSelectionsForPayload(
	servicesById: Record<string, BookingService>,
	selections: Record<string, ServiceEntryDraft[]>,
): ServiceBookingRequest["selections"] {
	return Object.entries(selections).flatMap(([serviceId, entries]) => {
		const service = servicesById[serviceId];
		if (!service) return [];
		return entries.map((entry) => {
			const { quantity, noteParts } = resolveSectionEntry(entry, service);
			if (entry.lineNote) noteParts.push(entry.lineNote);
			return {
				service_id: serviceId,
				quantity,
				selected_option_value_ids: Object.values(
					entry.selectedByOptionId,
				),
				line_note:
					noteParts.length > 0 ? noteParts.join(" | ") : undefined,
			};
		});
	});
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useServiceBookingFlow() {
	const { user, loading: authLoading } = useAuth();
	const [selections, setSelections] = useState<
		Record<string, ServiceEntryDraft[]>
	>({});
	const [pickupAt, setPickupAt] = useState("");
	const [pickupNote, setPickupNote] = useState("");
	const [customerNote, setCustomerNote] = useState("");
	const [validationError, setValidationError] = useState<string | null>(null);
	const [successOpen, setSuccessOpen] = useState(false);
	const [successOrderNumber, setSuccessOrderNumber] = useState<string | null>(
		null,
	);

	const bookingConfigQuery = useBookingConfig();

	const pricingMaps = useMemo(() => {
		const rules = bookingConfigQuery.data?.pricing;
		if (!rules || rules.length === 0) return undefined;
		const maps = buildPricingMaps(rules);
		setPricingMaps(maps);
		return maps;
	}, [bookingConfigQuery.data]);

	const servicesById = useMemo(() => {
		const map: Record<string, BookingService> = {};
		for (const section of bookingConfigQuery.data?.sections ?? []) {
			for (const service of section.services) {
				map[service.id] = service;
			}
		}
		return map;
	}, [bookingConfigQuery.data]);

	const summary = useMemo(
		() => computeBookingSummary(servicesById, selections, pricingMaps),
		[selections, servicesById, pricingMaps],
	);

	const bookingMutation = useServiceBookingMutation();

	const handleAddEntry = (service: BookingService) => {
		setValidationError(null);
		setSelections((prev) => {
			const current = prev[service.id] ?? [];
			return {
				...prev,
				[service.id]: [...current, createEntry(service)],
			};
		});
	};

	const handleUpdateEntry = (
		serviceId: string,
		entryId: string,
		update: Partial<ServiceEntryDraft>,
	) => {
		setSelections((prev) => {
			const entries = prev[serviceId] ?? [];
			return {
				...prev,
				[serviceId]: entries.map((e) =>
					e.entryId === entryId ? { ...e, ...update } : e,
				),
			};
		});
	};

	const handleRemoveEntry = (serviceId: string, entryId: string) => {
		setSelections((prev) => {
			const next = (prev[serviceId] ?? []).filter(
				(e) => e.entryId !== entryId,
			);
			if (next.length === 0) {
				const rest = { ...prev };
				delete rest[serviceId];
				return rest;
			}
			return { ...prev, [serviceId]: next };
		});
	};

	const handleSelectOptionValue = (
		service: BookingService,
		entryId: string,
		optionId: number,
		valueId: number,
		isRequired: boolean,
	) => {
		setValidationError(null);
		setSelections((prev) => {
			const entries = prev[service.id] ?? [];
			return {
				...prev,
				[service.id]: entries.map((entry) => {
					if (entry.entryId !== entryId) return entry;
					const key = String(optionId);
					const nextSelected = { ...entry.selectedByOptionId };
					if (nextSelected[key] === valueId && !isRequired) {
						delete nextSelected[key];
					} else {
						nextSelected[key] = valueId;
					}
					return { ...entry, selectedByOptionId: nextSelected };
				}),
			};
		});
	};

	const handleChangeLineNote = (
		serviceId: string,
		entryId: string,
		note: string,
	) => {
		setSelections((prev) => {
			const entries = prev[serviceId] ?? [];
			return {
				...prev,
				[serviceId]: entries.map((e) =>
					e.entryId === entryId ? { ...e, lineNote: note } : e,
				),
			};
		});
	};

	const handleSubmit = () => {
		if (!user) {
			setValidationError("Vui lòng đăng nhập để đặt dịch vụ.");
			return;
		}
		const error = validateSelections(servicesById, selections, pickupAt);
		if (error) {
			setValidationError(error);
			return;
		}
		bookingMutation.mutate(
			{
				pickup_at: pickupAt
					? new Date(pickupAt).toISOString()
					: undefined,
				pickup_note: pickupNote || undefined,
				customer_note: customerNote || undefined,
				selections: buildSelectionsForPayload(servicesById, selections),
			},
			{
				onSuccess: (data) => {
					setSuccessOrderNumber(
						(data as { order_number: string }).order_number,
					);
					setSuccessOpen(true);
					setSelections({});
					setPickupAt("");
					setPickupNote("");
					setCustomerNote("");
					setValidationError(null);
				},
			},
		);
	};

	const handleBookMore = () => {
		setSuccessOpen(false);
		setSuccessOrderNumber(null);
		setSelections({});
		setPickupAt("");
		setPickupNote("");
		setCustomerNote("");
		setValidationError(null);
	};

	return {
		// auth
		user,
		authLoading,
		// query
		bookingConfigQuery,
		servicesById,
		// form state
		selections,
		pickupAt,
		setPickupAt,
		pickupNote,
		setPickupNote,
		customerNote,
		setCustomerNote,
		validationError,
		// summary
		summary,
		// mutation
		bookingMutation,
		// success drawer
		successOpen,
		setSuccessOpen,
		successOrderNumber,
		// handlers
		handleAddEntry,
		handleUpdateEntry,
		handleRemoveEntry,
		handleSelectOptionValue,
		handleChangeLineNote,
		handleSubmit,
		handleBookMore,
	};
}
