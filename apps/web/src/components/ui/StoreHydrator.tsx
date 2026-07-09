"use client";

import { useCheckoutStore } from "@/store";
import { useEffect } from "react";

export function StoreHydrator() {
	useEffect(() => {
		useCheckoutStore.persist.rehydrate();
	}, []);

	return null;
}
