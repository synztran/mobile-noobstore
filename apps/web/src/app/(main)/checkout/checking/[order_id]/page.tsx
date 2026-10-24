"use client";

import CheckingPageContent from "@/components/checkout/CheckingPageContent";
import { toast } from "@/lib/toast";
import { useCheckoutStore } from "@/store";
import { useRouter } from "next/navigation";
import { use, useEffect } from "react";

export default function CheckingWithOrderId({
	params,
}: {
	params: Promise<{ order_id: string }>;
}) {
	const { order_id } = use(params);
	const router = useRouter();
	const orderNumber = useCheckoutStore((s) => s.orderNumber);

	useEffect(() => {
		if (!order_id && !orderNumber) {
			toast.error("Không tìm thấy đơn hàng. Vui lòng thử lại.");
			router.replace("/shop");
		}
	}, [order_id, orderNumber, router]);

	if (!order_id && !orderNumber) {
		return null;
	}

	return <CheckingPageContent identifier={order_id} />;
}
