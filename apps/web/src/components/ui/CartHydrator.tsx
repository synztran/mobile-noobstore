"use client";

import { useCartQuery } from "@/lib/react-query/cart/api/useCartQueries";
import { useCartStore } from "@/store";
import { useEffect } from "react";

export function CartHydrator() {
	useCartQuery();

	useEffect(() => {
		useCartStore.persist.rehydrate();
		useCartStore.getState().setHydrated(true);
	}, []);

	return null;
}
