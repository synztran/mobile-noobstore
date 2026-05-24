import { appQueryKeys } from "@/lib/react-query/root";
import type {
	GachaEventResponse,
	GachaHistoryPage,
	GachaMission,
} from "@/lib/react-query/router/gacha";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";

export function useGachaEvent(eventId: number) {
	return useQuery<GachaEventResponse>({
		...appQueryKeys.gacha.event(eventId),
		staleTime: 60_000,
		queryFn: () =>
			fetch(`/api/gacha?event_id=${eventId}`).then((r) => r.json()),
	});
}

export function useGachaHistory(eventId: number, enabled: boolean) {
	return useInfiniteQuery<GachaHistoryPage>({
		...appQueryKeys.gacha.history(eventId),
		queryFn: async ({ pageParam }) => {
			const res = await fetch(
				`/api/gacha/history?event_id=${eventId}&page=${pageParam}`,
			);
			return res.json() as Promise<GachaHistoryPage>;
		},
		initialPageParam: 1,
		getNextPageParam: (lastPage, allPages) =>
			lastPage.hasMore ? allPages.length + 1 : undefined,
		enabled,
		staleTime: 30_000,
	});
}

export function useGachaMissions(eventId: number) {
	return useQuery<{ missions: GachaMission[] }>({
		...appQueryKeys.gacha.missions(eventId),
		staleTime: 60_000,
		queryFn: () =>
			fetch(`/api/gacha/mission?event_id=${eventId}`).then((r) =>
				r.json(),
			),
	});
}

export function useGachaDraw() {
	return useMutation({
		mutationFn: async (eventId: number) => {
			const res = await fetch("/api/gacha", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ event_id: eventId }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? "Draw failed");
			return data;
		},
	});
}
