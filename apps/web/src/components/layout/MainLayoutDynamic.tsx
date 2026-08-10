"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { DeferredMount } from "@/components/ui/DeferredMount";
import { SearchDeferred } from "@/components/layout/SearchDeferred";

const CartDrawer = dynamic(
	() => import("@/components/cart/CartDrawer").then((m) => ({ default: m.CartDrawer })),
	{ ssr: false },
);
const PushNotificationPrompt = dynamic(
	() => import("@/components/notifications/PushNotificationPrompt").then((m) => ({ default: m.PushNotificationPrompt })),
	{ ssr: false },
);

export function MainLayoutDynamic() {
	return (
		<>
			<SearchDeferred />
			<Suspense fallback={null}><CartDrawer /></Suspense>
			<DeferredMount>
				<Suspense fallback={null}><PushNotificationPrompt /></Suspense>
			</DeferredMount>
		</>
	);
}