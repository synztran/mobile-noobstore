"use client";

import { useCartQuery } from "@/modules/cart/client/queries";
import { useCartStore } from "@/modules/cart/client/useCartStore";
import { useEffect } from "react";

export function CartHydrator() {
	useCartQuery();

	useEffect(() => {
		useCartStore.persist.rehydrate();
		useCartStore.getState().setHydrated(true);
	}, []);

	return null;
}
