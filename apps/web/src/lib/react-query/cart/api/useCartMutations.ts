import type { AddToCartRequest } from "@/app/api/cart/add/route";
import { useMutation } from "@tanstack/react-query";

export function useAddToCart() {
	return useMutation({
		mutationFn: async (body: AddToCartRequest) => {
			const res = await fetch("/api/cart/add", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!res.ok) throw new Error("Failed to add cart item");
		},
	});
}
