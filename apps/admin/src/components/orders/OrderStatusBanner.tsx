"use client";

import { Check, X } from "lucide-react";

interface Props {
	status: string;
	updatedAt: string | null;
	cancelledNote: string | null;
}

export default function OrderStatusBanner({
	status,
	updatedAt,
	cancelledNote,
}: Props) {
	if (
		status === "confirmed" ||
		status === "delivering" ||
		status === "delivered"
	) {
		return (
			<div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
				<Check className="w-4 h-4 shrink-0" />
				<span>
					Payment confirmed
					{updatedAt && (
						<span className="text-green-600 ml-1">
							· {new Date(updatedAt).toLocaleString("vi-VN")}
						</span>
					)}
				</span>
			</div>
		);
	}

	if (status === "cancelled" && cancelledNote) {
		return (
			<div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
				<X className="w-4 h-4 shrink-0 mt-0.5" />
				<div>
					<span className="font-medium">Cancellation note: </span>
					{cancelledNote}
				</div>
			</div>
		);
	}

	return null;
}
