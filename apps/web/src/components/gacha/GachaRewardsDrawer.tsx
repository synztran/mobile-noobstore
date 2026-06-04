"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { memo, useEffect } from "react";

interface GachaReward {
	id: number;
	reward_type: "product" | "point" | "puzzle" | "lucky_text";
	name: string;
	description: string | null;
	value: string | null;
	thumbnail_url: string | null;
	weight: number;
	max_quantity: number | null;
	claimed_count: number;
	is_golden: boolean;
	percent: number;
	percent_display: number;
}

interface GachaRewardsDrawerProps {
	open: boolean;
	onClose: () => void;
	rewards: GachaReward[];
}

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
	product: { label: "Sản phẩm", color: "badge-primary" },
	point: { label: "Điểm", color: "badge-success" },
	puzzle: { label: "Câu đố", color: "badge-info" },
	lucky_text: { label: "Lời chúc", color: "badge-secondary" },
};

const RewardCard = memo(function RewardCard({ r }: { r: GachaReward }) {
	const typeBadge = TYPE_BADGE[r.reward_type] ?? {
		label: r.reward_type,
		color: "badge-ghost",
	};
	const remaining =
		r.max_quantity != null ? r.max_quantity - r.claimed_count : null;
	const isExhausted = remaining != null && remaining <= 0;

	return (
		<div
			className={`flex flex-col rounded-2xl border ${
				r.is_golden
					? "border-amber-400/60 bg-amber-400/5"
					: "border-base-200 bg-base-100"
			} ${isExhausted ? "opacity-40" : ""}`}>
			{/* Thumbnail area */}
			<div
				className="relative w-full h-20 flex items-center justify-center shrink-0 overflow-hidden rounded-t-2xl"
				style={{
					background: r.is_golden
						? "linear-gradient(135deg, #FEF3C7, #FDE68A)"
						: "linear-gradient(135deg, #f3f4f6, #e5e7eb)",
				}}>
				{r.thumbnail_url ? (
					<Image
						src={r.thumbnail_url}
						alt="reward thumbnail"
						fill
						className="w-full h-full object-cover"
					/>
				) : (
					<span className="text-3xl">{r.is_golden ? "★" : "🎱"}</span>
				)}
				{/* Percent overlay */}
				<span className="absolute top-1 right-1 text-[9px] font-black bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full px-1.5 py-0.5 leading-none shadow-sm shadow-orange-400/60">
					{r.percent.toFixed(1)}%
				</span>
				{/* Remaining overlay */}
				{remaining != null && (
					<span
						className={`absolute top-1 left-1 text-[9px] font-black rounded-full px-1.5 py-0.5 leading-none shadow-sm ${
							isExhausted
								? "bg-red-500/80 text-white"
								: "bg-black/50 text-white"
						}`}>
						{isExhausted ? "Hết" : `Còn ${remaining}`}
					</span>
				)}
			</div>

			{/* Info area */}
			<div className="flex flex-col gap-0.5 p-1.5 flex-1">
				<p className="font-bold text-[10px] leading-tight line-clamp-2">
					{r.name}
				</p>
				<div className="flex items-center gap-1 mt-auto pt-1 flex-wrap">
					<span
						className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${typeBadge.color}`}>
						{typeBadge.label}
					</span>
					{r.is_golden && (
						<span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-400 text-white">
							✦ Đặc biệt
						</span>
					)}
				</div>
			</div>
		</div>
	);
});

export function GachaRewardsDrawer({
	open,
	onClose,
	rewards,
}: GachaRewardsDrawerProps) {
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	if (!open) return null;

	return (
		<>
			<div
				className="fixed inset-0 bg-black/50 z-[60]"
				onClick={onClose}
			/>
			<aside
				role="dialog"
				aria-modal="true"
				aria-label="Rewards list"
				className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-2xl bg-base-100 flex flex-col h-[55vh]">
				{/* Header */}
				<div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-base-200">
					<div>
						<h2 className="text-base font-black">
							Danh sách phần thưởng
						</h2>
						<p className="text-xs text-base-content/50">
							{rewards.length} phần thưởng có thể nhận được khi
							tham gia quay thưởng
						</p>
					</div>
					<button
						aria-label="Đóng"
						onClick={onClose}
						className="p-1 rounded-full hover:bg-base-200">
						<X size={18} />
					</button>
				</div>

				{/* Reward list */}
				<div className="overflow-y-auto flex-1 px-3 py-3 grid grid-cols-2 gap-2 content-start">
					{rewards.map((r, idx) => (
						<RewardCard key={idx} r={r} />
					))}
				</div>
			</aside>
		</>
	);
}
