"use client";

import { Check, ChevronRight, RotateCcw, XCircle } from "lucide-react";
import { useState } from "react";

const STATUS_FLOW = [
	"pending",
	"confirmed",
	"delivering",
	"delivered",
] as const;
type MainStatus = (typeof STATUS_FLOW)[number];

interface Props {
	orderId: string;
	currentStatus: string;
	onUpdated: () => void;
}

function StepIndicator({ current }: { current: string }) {
	const steps = STATUS_FLOW;
	const currentIdx = steps.indexOf(current as MainStatus);

	return (
		<div className="flex items-center gap-0">
			{steps.map((step, i) => {
				const done = i < currentIdx;
				const active = i === currentIdx;
				return (
					<div key={step} className="flex items-center">
						<div
							className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border-2 transition-colors
								${done ? "bg-green-500 border-green-500 text-white" : active ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-300 text-slate-400"}`}>
							{done ? <Check className="w-3 h-3" /> : i + 1}
						</div>
						<div className="flex flex-col items-start mx-1.5">
							<span
								className={`text-xs capitalize leading-none font-medium ${active ? "text-blue-700" : done ? "text-green-600" : "text-slate-400"}`}>
								{step}
							</span>
						</div>
						{i < steps.length - 1 && (
							<div
								className={`w-6 h-px mr-1.5 ${i < currentIdx ? "bg-green-400" : "bg-slate-200"}`}
							/>
						)}
					</div>
				);
			})}
		</div>
	);
}

export default function OrderActionBar({
	orderId,
	currentStatus,
	onUpdated,
}: Props) {
	console.log(currentStatus);
	const [actionLoading, setActionLoading] = useState(false);
	const [actionError, setActionError] = useState<string | null>(null);
	const [showCancel, setShowCancel] = useState(false);
	const [cancelNote, setCancelNote] = useState("");
	const [showRefund, setShowRefund] = useState(false);

	const flowIdx = STATUS_FLOW.indexOf(currentStatus as MainStatus);
	const nextStatus =
		flowIdx >= 0 && flowIdx < STATUS_FLOW.length - 1
			? STATUS_FLOW[flowIdx + 1]
			: null;

	const isTerminal =
		currentStatus === "delivered" ||
		currentStatus === "cancelled" ||
		currentStatus === "refunded";
	const canRefund =
		currentStatus === "confirmed" ||
		currentStatus === "delivering" ||
		currentStatus === "cancelled";
	const canAdvance = nextStatus !== null;
	const canCancel = !isTerminal;

	const patch = async (body: Record<string, unknown>) => {
		setActionLoading(true);
		setActionError(null);
		try {
			const res = await fetch(`/api/orders/${orderId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error ?? "Update failed");
			onUpdated();
			setShowCancel(false);
			setShowRefund(false);
			setCancelNote("");
		} catch (e) {
			setActionError(e instanceof Error ? e.message : "Unknown error");
		} finally {
			setActionLoading(false);
		}
	};

	if (isTerminal && !canRefund) return null;

	return (
		<div className="shrink-0 border-t border-slate-200 px-6 py-4 space-y-3">
			{/* Step flow indicator */}
			{flowIdx >= 0 && (
				<div className="pb-1">
					<StepIndicator current={currentStatus} />
				</div>
			)}

			{actionError && (
				<p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
					{actionError}
				</p>
			)}

			{/* Inline cancel form */}
			{showCancel && (
				<div className="flex gap-2 items-start">
					<textarea
						value={cancelNote}
						onChange={(e) => setCancelNote(e.target.value)}
						placeholder="Cancellation reason (optional)"
						rows={2}
						className="flex-1 text-xs border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-400 resize-none"
					/>
					<div className="flex flex-col gap-1.5">
						<button
							onClick={() =>
								patch({
									status: "cancelled",
									cancelled_note: cancelNote,
								})
							}
							disabled={actionLoading}
							className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50 whitespace-nowrap">
							{actionLoading ? "Cancelling…" : "Confirm cancel"}
						</button>
						<button
							onClick={() => setShowCancel(false)}
							className="px-3 py-1.5 text-xs border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg whitespace-nowrap">
							Back
						</button>
					</div>
				</div>
			)}

			{/* Inline refund form */}
			{showRefund && (
				<div className="flex gap-2 items-center">
					<p className="flex-1 text-xs text-slate-500">
						Mark this order as refunded?
					</p>
					<button
						onClick={() => patch({ status: "refunded" })}
						disabled={actionLoading}
						className="px-3 py-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium disabled:opacity-50 whitespace-nowrap">
						{actionLoading ? "Processing…" : "Confirm refund"}
					</button>
					<button
						onClick={() => setShowRefund(false)}
						className="px-3 py-1.5 text-xs border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg whitespace-nowrap">
						Back
					</button>
				</div>
			)}

			{/* Action buttons */}
			{!showCancel && !showRefund && (
				<div className="flex items-center gap-2 flex-wrap">
					{canAdvance && (
						<button
							onClick={() => patch({ status: nextStatus! })}
							disabled={actionLoading}
							className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors capitalize whitespace-nowrap">
							<ChevronRight className="w-4 h-4" />
							Mark as {nextStatus}
						</button>
					)}
					{canRefund && (
						<button
							onClick={() => setShowRefund(true)}
							disabled={actionLoading}
							className="flex items-center gap-1.5 px-3 py-2 text-sm border border-orange-300 text-orange-600 hover:bg-orange-50 rounded-lg font-medium disabled:opacity-50 transition-colors whitespace-nowrap">
							<RotateCcw className="w-4 h-4" />
							Refund
						</button>
					)}
					{canCancel && (
						<button
							onClick={() => setShowCancel(true)}
							disabled={actionLoading}
							className="flex items-center gap-1.5 px-3 py-2 text-sm border border-red-300 text-red-600 hover:bg-red-50 rounded-lg font-medium disabled:opacity-50 transition-colors whitespace-nowrap">
							<XCircle className="w-4 h-4" />
							Cancel Order
						</button>
					)}
				</div>
			)}
		</div>
	);
}
