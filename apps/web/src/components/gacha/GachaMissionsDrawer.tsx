"use client";

import { TOKEN_ICON } from "@/lib/images";
import { useGachaMissions } from "@/lib/react-query/gacha/api/useGachaQueries";
import { CheckCircle2, X } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";

interface GachaMission {
	id: number;
	name: string;
	description: string | null;
	mission_type: string;
	requirement: {
		amount?: number;
		count?: number;
	};
	token_reward: number;
	progress: number | null;
	completed_at: string | null;
}

interface GachaMissionsDrawerProps {
	open: boolean;
	onClose: () => void;
	eventId: number;
}

const MISSION_TYPE_LABEL: Record<string, string> = {
	purchase: "Mua hàng",
	spin: "Quay thưởng",
	login: "Đăng nhập",
	referral: "Giới thiệu bạn",
	review: "Đánh giá",
};

export function GachaMissionsDrawer({
	open,
	onClose,
	eventId,
}: GachaMissionsDrawerProps) {
	const { data, isLoading } = useGachaMissions(eventId);

	const missions = data?.missions ?? [];
	const loading = isLoading && open;

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
				aria-label="Danh sách nhiệm vụ"
				className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-2xl bg-base-100 flex flex-col"
				style={{ maxHeight: "82vh" }}>
				{/* Header */}
				<div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-base-200">
					<div>
						<h2 className="text-base font-black">Nhiệm vụ</h2>
						<p className="text-xs text-base-content/50">
							Hoàn thành nhiệm vụ để nhận token quay thưởng
						</p>
					</div>
					<button
						aria-label="Đóng"
						onClick={onClose}
						className="p-1 rounded-full hover:bg-base-200">
						<X size={18} />
					</button>
				</div>

				{/* List */}
				<div className="overflow-y-auto flex-1 px-3 py-3 flex flex-col gap-2">
					{loading
						? Array.from({ length: 4 }).map((_, i) => (
								<div
									key={i}
									className="skeleton h-24 w-full rounded-2xl"
								/>
							))
						: missions.map((m) => (
								<MissionCard key={m.id} mission={m} />
							))}
					{!loading && missions.length === 0 && (
						<p className="text-sm text-base-content/50 text-center py-8">
							Không có nhiệm vụ nào.
						</p>
					)}
				</div>
			</aside>
		</>
	);
}

function MissionCard({ mission: m }: { mission: GachaMission }) {
	const progress = m.progress ?? 0;
	const requirement = m.requirement.amount ?? m.requirement.count ?? 1;
	const percent = Math.min(100, Math.round((progress / requirement) * 100));
	const isDone = m.completed_at != null;
	const typeLabel = MISSION_TYPE_LABEL[m.mission_type] ?? m.mission_type;

	return (
		<div
			className={`flex flex-col gap-2 rounded-2xl border p-3 ${
				isDone
					? "border-success/40 bg-success/5"
					: "border-base-200 bg-base-100"
			}`}>
			{/* Top row: name + reward */}
			<div className="flex items-start justify-between gap-2">
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-1.5 mb-0.5">
						<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-base-200 text-base-content/60">
							{typeLabel}
						</span>
						{isDone && (
							<CheckCircle2
								size={14}
								className="text-success shrink-0"
							/>
						)}
					</div>
					<p className="font-bold text-sm leading-tight">{m.name}</p>
					{m.description && (
						<p className="text-xs text-base-content/50 mt-0.5 line-clamp-2">
							{m.description}
						</p>
					)}
				</div>
				{/* Token reward */}
				<div className="flex items-center gap-1 bg-amber-400/10 border border-amber-400/30 rounded-xl px-2 py-1">
					<div className="relative w-6 h-6">
						<Image
							src={TOKEN_ICON}
							alt="Token"
							objectFit="contain"
							layout="fill"
						/>
					</div>
					<span className="text-xs font-black text-amber-600">
						+{m.token_reward}
					</span>
				</div>
			</div>

			{/* Progress bar */}
			<div>
				<div className="flex justify-between text-[10px] text-base-content/50 mb-1">
					<span>Tiến độ</span>
					<span>
						{progress} / {requirement}
					</span>
				</div>
				<div className="w-full h-2 rounded-full bg-base-200 overflow-hidden">
					<div
						className={`h-full rounded-full transition-all ${
							isDone ? "bg-success" : "bg-primary"
						}`}
						style={{ width: `${percent}%` }}
					/>
				</div>
			</div>

			{/* Claim button */}
			{isDone && (
				<button className="btn btn-success btn-sm w-full" disabled>
					Đã nhận thưởng ✓
				</button>
			)}
		</div>
	);
}
