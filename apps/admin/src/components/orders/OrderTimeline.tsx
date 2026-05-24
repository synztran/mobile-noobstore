import {
	BanknoteIcon,
	CheckCircle2,
	CircleDashed,
	PackageCheck,
	RotateCcw,
	Truck,
	XCircle,
} from "lucide-react";

interface TimelineEntry {
	key: string;
	label: string;
	timestamp: string | null;
	note?: string | null;
	icon: React.ReactNode;
	color: string; // tailwind border/text color token
	bg: string;
}

interface Props {
	createdAt: string | null;
	paidAt: string | null;
	deliveringAt: string | null;
	deliveredAt: string | null;
	cancelledAt: string | null;
	cancelledNote: string | null;
	refundedAt: string | null;
	status: string;
	updatedAt: string | null;
}

function fmtDate(ts: string) {
	return new Date(ts).toLocaleDateString("vi-VN");
}

function fmtTime(ts: string) {
	return new Date(ts).toLocaleTimeString("vi-VN", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function OrderTimeline({
	createdAt,
	paidAt,
	deliveringAt,
	deliveredAt,
	cancelledAt,
	cancelledNote,
	refundedAt,
	status,
	updatedAt,
}: Props) {
	const entries: TimelineEntry[] = [
		{
			key: "placed",
			label: "Order placed",
			timestamp: createdAt,
			icon: <CircleDashed className="w-4 h-4" />,
			color: "border-slate-300 text-slate-600",
			bg: "bg-slate-50",
		},
		{
			key: "paid",
			label: "Payment confirmed",
			timestamp: paidAt,
			icon: <BanknoteIcon className="w-4 h-4" />,
			color: "border-green-300 text-green-700",
			bg: "bg-green-50",
		},
		{
			key: "delivering",
			label: "Out for delivery",
			timestamp:
				deliveringAt ??
				(status === "delivering" || status === "delivered"
					? updatedAt
					: null),
			icon: <Truck className="w-4 h-4" />,
			color: "border-purple-300 text-purple-700",
			bg: "bg-purple-50",
		},
		{
			key: "delivered",
			label: "Delivered",
			timestamp:
				deliveredAt ?? (status === "delivered" ? updatedAt : null),
			icon: <PackageCheck className="w-4 h-4" />,
			color: "border-green-400 text-green-800",
			bg: "bg-green-50",
		},
		{
			key: "cancelled",
			label: "Cancelled",
			timestamp: cancelledAt,
			note: cancelledNote,
			icon: <XCircle className="w-4 h-4" />,
			color: "border-red-300 text-red-700",
			bg: "bg-red-50",
		},
		{
			key: "refunded",
			label: "Refunded",
			timestamp: refundedAt,
			icon: <RotateCcw className="w-4 h-4" />,
			color: "border-orange-300 text-orange-700",
			bg: "bg-orange-50",
		},
	];

	const active = entries.filter((e) => e.timestamp);

	if (active.length === 0) return null;

	return (
		<div className="border border-slate-200 rounded-lg px-4 py-3">
			<h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
				Order History
			</h3>

			<div className="relative">
				{/* Vertical line */}
				<div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200" />

				<div className="space-y-2">
					{active.map((entry) => (
						<div
							key={entry.key}
							className="flex items-center gap-3">
							{/* Icon bubble */}
							<div
								className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border ${entry.bg} ${entry.color} shrink-0`}>
								{entry.icon}
							</div>

							{/* Content */}
							<div
								className={`flex-1 rounded-lg border px-3 py-2 ${entry.bg} ${entry.color.replace("text-", "border-")}`}>
								<div className="flex items-baseline justify-between gap-4">
									<span
										className={`text-sm font-medium ${entry.color.split(" ")[1]}`}>
										{entry.label}
									</span>
									<div className="flex flex-col items-end shrink-0">
										<span className="text-xs text-slate-400">
											{fmtTime(entry.timestamp!)}
										</span>
										<span className="text-xs text-slate-400">
											{fmtDate(entry.timestamp!)}
										</span>
									</div>
								</div>
								{entry.note && (
									<p className="text-xs text-slate-500 mt-0.5 italic">
										Reason: {entry.note}
									</p>
								)}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
