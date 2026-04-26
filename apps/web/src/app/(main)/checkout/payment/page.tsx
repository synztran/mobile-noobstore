"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * @deprecated
 * Payment page has been moved to /checkout/checking/[id]
 * This page redirects to checking for backward compatibility
 */
export default function PaymentPage() {
	const router = useRouter();
	const params = useParams();
	const id = params?.id as string;

	useEffect(() => {
		if (id) {
			router.replace(`/checkout/checking/${id}`);
		} else {
			router.replace("/checkout/shipping");
		}
	}, [id, router]);

	return (
		<div className="animate-pulse space-y-6">
			<div className="h-4 w-32 bg-surface-container rounded-full" />
			<div className="bg-surface-container-lowest rounded-5xl p-8 flex flex-col items-center gap-4">
				<div className="w-full h-64 bg-surface-container rounded-2xl" />
				<div className="w-full h-24 bg-surface-container rounded-2xl" />
			</div>
			<div className="h-4 w-48 bg-surface-container rounded-full" />
			<div className="bg-surface-container-low rounded-5xl p-6 space-y-6">
				{[1, 2, 3, 4].map((i) => (
					<div key={i} className="flex justify-between items-center">
						<div className="space-y-1.5">
							<div className="h-2.5 w-24 bg-surface-container rounded-full" />
							<div className="h-4 w-40 bg-surface-container rounded-full" />
						</div>
						<div className="w-10 h-10 rounded-full bg-surface-container" />
					</div>
				))}
			</div>
			<div className="h-14 rounded-full bg-surface-container" />
		</div>
	);
}
