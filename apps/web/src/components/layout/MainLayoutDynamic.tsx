"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const CartDrawer = dynamic(
	() => import("@/components/cart/CartDrawer").then((m) => ({ default: m.CartDrawer })),
	{ ssr: false },
);
const SearchFloating = dynamic(
	() => import("@/components/layout/SearchFloating").then((m) => ({ default: m.SearchFloating })),
	{ ssr: false },
);
const PushNotificationPrompt = dynamic(
	() => import("@/components/notifications/PushNotificationPrompt").then((m) => ({ default: m.PushNotificationPrompt })),
	{ ssr: false },
);

export function MainLayoutDynamic() {
	return (
		<>
			<Suspense fallback={null}><SearchFloating /></Suspense>
			<Suspense fallback={null}><CartDrawer /></Suspense>
			<Suspense fallback={null}><PushNotificationPrompt /></Suspense>
		</>
	);
}
