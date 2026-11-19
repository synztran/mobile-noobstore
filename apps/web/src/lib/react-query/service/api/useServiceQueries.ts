import { apiFetch } from "@/lib/api/fetch";
import type { BookingConfigResponse } from "@/app/api/services/booking-config/route";
import type { Service } from "@/app/api/services/route";
import { appQueryKeys } from "@/lib/react-query/root";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";


export function useServiceDetail(slug: string) {
	return useQuery<Service>({
		...appQueryKeys.service.detail(slug),
		staleTime: 60_000,
		queryFn: async () => {
			const res = await apiFetch(`/api/services/${slug}`);
			if (res.status === 404) throw new Error("NOT_FOUND");
			if (!res.ok) throw new Error("Không thể tải thông tin dịch vụ");
			return res.json();
		},
	});
}

export function useBookingConfig() {
	return useQuery<BookingConfigResponse>({
		...appQueryKeys.service.bookingConfig,
		staleTime: 60_000,
		queryFn: async () => {
			const res = await apiFetch("/api/services/booking-config");
			if (!res.ok) throw new Error("Không thể tải dữ liệu dịch vụ");
			return res.json();
		},
	});
}

export function useServiceBookingMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (payload: unknown) => {
			const res = await apiFetch("/api/service-bookings", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error ?? "Không thể tạo đơn dịch vụ");
			}
			return res.json();
		},
		onSuccess: () => {
			void queryClient.invalidateQueries(
				appQueryKeys.service.bookingConfig,
			);
		},
	});
}
