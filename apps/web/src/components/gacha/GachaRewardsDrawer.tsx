"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

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
				className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-2xl bg-base-100 flex flex-col"
				style={{ maxHeight: "82vh" }}>
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
				<div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-2.5">
					{rewards.map((r) => {
						const typeBadge = TYPE_BADGE[r.reward_type] ?? {
							label: r.reward_type,
							color: "badge-ghost",
						};
						const remaining =
							r.max_quantity != null
								? r.max_quantity - r.claimed_count
								: null;
						const isExhausted = remaining != null && remaining <= 0;

						return (
							<div
								key={r.id}
								className={`flex items-center gap-3 p-3 rounded-xl border ${
									r.is_golden
										? "border-amber-400/60 bg-amber-400/5"
										: "border-base-200"
								} ${isExhausted ? "opacity-40" : ""}`}>
								{/* Icon/thumbnail */}
								<div
									className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center text-xl"
									style={{
										background: r.is_golden
											? "linear-gradient(135deg, #FCD34D, #F59E0B)"
											: "linear-gradient(135deg, #e5e7eb, #d1d5db)",
									}}>
									{r.thumbnail_url ? (
										// eslint-disable-next-line @next/next/no-img-element
										<img
											src={r.thumbnail_url}
											alt=""
											className="w-full h-full rounded-full object-cover"
										/>
									) : (
										<span>{r.is_golden ? "★" : "🎱"}</span>
									)}
								</div>

								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-1.5 flex-wrap">
										<p className="font-bold text-sm">
											{r.name}
										</p>
										{r.is_golden && (
											<span className="badge badge-warning badge-sm font-black text-white">
												Giải đặc biệt
											</span>
										)}
									</div>
									{r.description && (
										<p className="text-xs text-base-content/80 line-clamp-2">
											{r.description}
										</p>
									)}
									<div className="flex items-center gap-1.5 mt-1 flex-wrap">
										<span
											className={`badge badge-sm ${typeBadge.color}`}>
											{typeBadge.label}
										</span>
										{r.value && (
											<span className="text-[10px] text-base-content/60">
												{r.reward_type === "point"
													? `${r.value} điểm`
													: r.value}
											</span>
										)}
									</div>
								</div>

								<div className="flex flex-col items-end gap-1 shrink-0">
									{/* Appearance chance */}
									<span className="text-sm font-black text-primary">
										{r.percent.toFixed(1)}%
									</span>
									{/* Remaining stock */}
									{remaining != null && (
										<span
											className={`text-[10px] ${isExhausted ? "text-error" : "text-base-content/60"}`}>
											{isExhausted
												? "Hết hàng"
												: `${remaining} còn lại`}
										</span>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</aside>
		</>
	);
}
