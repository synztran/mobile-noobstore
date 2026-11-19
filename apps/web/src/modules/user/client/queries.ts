import { apiFetch } from "@/lib/api/fetch";
import type { ProfileAddress } from "@/modules/user/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";


export interface ProfileResponse {
	addresses?: ProfileAddress[];
	[key: string]: unknown;
}

export function useProfileAddresses(enabled = true) {
	return useQuery<ProfileResponse>({
		queryKey: ["user", "profile"],
		enabled,
		staleTime: 60_000,
		queryFn: async () => {
			const res = await apiFetch("/api/user/profile", {
				credentials: "include",
			});
			if (res.status === 401) throw new Error("Unauthorized");
			if (!res.ok) throw new Error("Failed to fetch profile");
			return res.json();
		},
	});
}

export function useUpdateProfileAddresses() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (addresses: Array<Omit<ProfileAddress, "id" | "user_id" | "created_at" | "updated_at">>) => {
			const res = await apiFetch("/api/user/profile", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ addresses }),
			});
			if (!res.ok) {
				const data = (await res.json()) as { error?: string };
				throw new Error(data.error ?? "Save failed");
			}
			return res.json() as Promise<ProfileResponse>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["user", "profile"] });
		},
	});
}
