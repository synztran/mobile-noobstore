"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface HistoryReward {
	id: number;
	reward_type: string;
	name: string;
	description: string | null;
	value: string | null;
	thumbnail_url: string | null;
	is_golden: boolean;
}

interface HistoryEntry {
	id: number;
	played_at: string;
	reward: HistoryReward | null;
}

interface GachaHistoryDrawerProps {
	open: boolean;
	onClose: () => void;
	eventId: number;
}

const REWARD_TYPE_LABEL: Record<string, string> = {
	product: "Sản phẩm",
	point: "Điểm",
	puzzle: "Mảnh ghép",
	lucky_text: "Tin nhắn may mắn",
};

function formatDate(iso: string) {
	return new Date(iso).toLocaleString("vi-VN", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function GachaHistoryDrawer({
	open,
	onClose,
	eventId,
}: GachaHistoryDrawerProps) {
	const [entries, setEntries] = useState<HistoryEntry[]>([]);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(false);
	const [loading, setLoading] = useState(false);
	const [initialLoad, setInitialLoad] = useState(true);
	const sentinelRef = useRef<HTMLDivElement>(null);

	const fetchPage = useCallback(
		async (p: number, reset = false) => {
			setLoading(true);
			try {
				const res = await fetch(
					`/api/gacha/history?event_id=${eventId}&page=${p}`,
				);
				const data = await res.json();
				if (data.history) {
					setEntries((prev) =>
						reset ? data.history : [...prev, ...data.history],
					);
					setHasMore(data.hasMore);
				}
			} finally {
				setLoading(false);
				setInitialLoad(false);
			}
		},
		[eventId],
	);

	// Reset and load when drawer opens
	useEffect(() => {
		if (!open) return;
		setEntries([]);
		setPage(1);
		setInitialLoad(true);
		fetchPage(1, true);
	}, [open, fetchPage]);

	// Infinite scroll via IntersectionObserver
	useEffect(() => {
		if (!sentinelRef.current || !hasMore || loading) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					const next = page + 1;
					setPage(next);
					fetchPage(next);
				}
			},
			{ threshold: 0.1 },
		);
		observer.observe(sentinelRef.current);
		return () => observer.disconnect();
	}, [hasMore, loading, page, fetchPage]);

	// Trap escape key
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
				aria-label="Play history"
				className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-2xl bg-base-100 flex flex-col"
				style={{ maxHeight: "80vh" }}>
				{/* Header */}
				<div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-base-200">
					<h2 className="text-base font-black">Lịch sử tham gia</h2>
					<button
						aria-label="Đóng"
						onClick={onClose}
						className="p-1 rounded-full hover:bg-base-200">
						<X size={18} />
					</button>
				</div>

				{/* Content */}
				<div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-2">
					{initialLoad ? (
						// Skeleton
						[...Array(5)].map((_, i) => (
							<div
								key={i}
								className="flex items-center gap-3 p-3 rounded-xl bg-base-200 animate-pulse">
								<div className="w-10 h-10 rounded-full bg-base-300 shrink-0" />
								<div className="flex-1 flex flex-col gap-1.5">
									<div className="h-3 bg-base-300 rounded w-2/3" />
									<div className="h-2.5 bg-base-300 rounded w-1/3" />
								</div>
							</div>
						))
					) : entries.length === 0 ? (
						<p className="text-center text-sm text-base-content/50 py-10">
							Chưa có lượt chơi nào. Hãy thử vận may của bạn! 🎰
						</p>
					) : (
						entries.map((entry) => (
							<div
								key={entry.id}
								className="flex items-center gap-3 p-3 rounded-xl border border-base-200">
								{/* Reward icon / thumbnail */}
								<div
									className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-lg"
									style={{
										background: entry.reward?.is_golden
											? "linear-gradient(135deg, #FCD34D, #F59E0B)"
											: "linear-gradient(135deg, #e5e7eb, #d1d5db)",
									}}>
									{entry.reward?.thumbnail_url ? (
										// eslint-disable-next-line @next/next/no-img-element
										<img
											src={entry.reward.thumbnail_url}
											alt=""
											className="w-full h-full rounded-full object-cover"
										/>
									) : (
										<span>
											{entry.reward?.is_golden
												? "★"
												: "🎱"}
										</span>
									)}
								</div>

								<div className="flex-1 min-w-0">
									<div className="flex items-center justify-between gap-2">
										<p className="font-bold text-sm truncate">
											{entry.reward?.name ??
												"Unknown reward"}
										</p>
										<span className="text-xs text-base-content/80 shrink-0">
											{formatDate(entry.played_at)}
										</span>
									</div>
									<p className="text-xs text-base-content/50">
										{entry.reward
											? (REWARD_TYPE_LABEL[
													entry.reward.reward_type
												] ?? entry.reward.reward_type)
											: "—"}{" "}
										·{" "}
										{entry.reward?.value
											? entry.reward.reward_type ===
												"point"
												? `${entry.reward.value} điểm`
												: entry.reward.value
											: null}
									</p>
								</div>
							</div>
						))
					)}

					{/* Infinite scroll sentinel */}
					<div ref={sentinelRef} />

					{loading && !initialLoad && (
						<div className="flex justify-center py-2">
							<span className="loading loading-spinner loading-sm" />
						</div>
					)}

					{!hasMore && entries.length > 0 && (
						<p className="text-center text-xs text-base-content/30 py-3">
							Đã xem hết!
						</p>
					)}
				</div>
			</aside>
		</>
	);
}
