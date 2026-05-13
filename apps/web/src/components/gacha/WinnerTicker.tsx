"use client";

import { memo, useEffect, useState } from "react";

interface Winner {
	displayName: string;
	rewardName: string;
	isGolden: boolean;
}

interface WinnerTickerProps {
	eventId: number;
}

export const WinnerTicker = memo(function WinnerTicker({
	eventId,
}: WinnerTickerProps) {
	const [winners, setWinners] = useState<Winner[]>([]);

	useEffect(() => {
		fetch(`/api/gacha/recent-winners?event_id=${eventId}&limit=15`)
			.then((r) => r.json())
			.then((data) => {
				if (data.winners) setWinners(data.winners);
			})
			.catch(() => null);
	}, [eventId]);

	if (winners.length === 0) return null;

	// Duplicate list so the scroll loops seamlessly.
	// Items use pr-6 (not gap) so -50% aligns exactly with one copy width.
	const items = [...winners, ...winners];
	// 3s per unique winner keeps the pace readable
	const duration = Math.max(6, winners.length * 2.5);

	return (
		<div className="w-full overflow-hidden rounded-xl mb-3 relative">
			<div
				className="flex items-center gap-1 px-2 py-0.5 rounded-xl"
				style={{
					background:
						"linear-gradient(90deg, rgba(0,0,0,0.72) 0%, rgba(30,20,0,0.82) 100%)",
				}}>
				{/* Static label */}
				<span className="shrink-0 text-[10px]  font-black uppercase tracking-widest text-amber-400 px-1.5 py-0.5 rounded bg-amber-400/15 ">
					🏆 Winners
				</span>

				{/* Scrolling track */}
				<div className="flex-1 overflow-hidden">
					<div
						className="inline-flex whitespace-nowrap h-[26.5px]"
						style={{
							animation: `gacha-ticker ${duration}s linear infinite`,
							willChange: "transform",
						}}>
						{items.map((w, i) => (
							<span
								key={i}
								className="inline-flex items-center gap-1 text-[10px] font-semibold shrink-0 pr-6"
								style={{
									color: w.isGolden ? "#FCD34D" : "#e5e7eb",
								}}>
								{w.isGolden ? "★" : "·"}{" "}
								<span className="font-black">
									{w.displayName}
								</span>{" "}
								<span className="opacity-70">đã nhận</span>{" "}
								<span>{w.rewardName}</span>
							</span>
						))}
					</div>
				</div>
			</div>

			<style>{`
				@keyframes gacha-ticker {
					0% { transform: translateX(0); }
					100% { transform: translateX(-50%); }
				}
			`}</style>
		</div>
	);
});
