"use client";

import { useEffect, useRef, useState } from "react";

interface Winner {
	displayName: string;
	rewardName: string;
	isGolden: boolean;
}

interface WinnerTickerProps {
	eventId: number;
}

export function WinnerTicker({ eventId }: WinnerTickerProps) {
	const [winners, setWinners] = useState<Winner[]>([]);
	const trackRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		fetch(`/api/gacha/recent-winners?event_id=${eventId}&limit=15`)
			.then((r) => r.json())
			.then((data) => {
				if (data.winners) setWinners(data.winners);
			})
			.catch(() => null);
	}, [eventId]);

	if (winners.length === 0) return null;

	// Duplicate list so the scroll loops seamlessly
	const items = [...winners, ...winners];

	return (
		<div className="w-full overflow-hidden rounded-xl mb-3 relative">
			<div
				className="flex items-center gap-1 px-2 py-1.5 rounded-xl"
				style={{
					background:
						"linear-gradient(90deg, rgba(0,0,0,0.72) 0%, rgba(30,20,0,0.82) 100%)",
				}}>
				{/* Static label */}
				<span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-amber-400 px-1.5 py-0.5 rounded bg-amber-400/15 mr-1">
					🏆 Winners
				</span>

				{/* Scrolling track */}
				<div className="flex-1 overflow-hidden">
					<div
						ref={trackRef}
						className="flex gap-6 whitespace-nowrap"
						style={{
							animation: `gacha-ticker ${items.length * 0.5}s linear infinite`,
						}}>
						{items.map((w, i) => (
							<span
								key={i}
								className="inline-flex items-center gap-1 text-[10px] font-semibold shrink-0"
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
}
