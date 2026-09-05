"use client";

import { useRecentWinners } from "@/modules/gacha/client/queries";
import { memo } from "react";

interface WinnerTickerProps {
  eventId: number;
}

export const WinnerTicker = memo(function WinnerTicker({
  eventId,
}: WinnerTickerProps) {
  const { data } = useRecentWinners(eventId);
  const winners = data?.winners ?? [];

  if (winners.length === 0) return null;

  // Duplicate list so the scroll loops seamlessly.
  // Items use pr-6 (not gap) so -50% aligns exactly with one copy width.
  const items = [...winners, ...winners];
  // 3s per unique winner keeps the pace readable
  const duration = Math.max(6, winners.length * 2.5);

  return (
    <div className="relative w-full overflow-hidden rounded-xl">
      <div
        className="flex items-center gap-1 rounded-xl px-2 py-0.5"
        style={{
          background:
            "linear-gradient(90deg, rgba(0,0,0,0.72) 0%, rgba(30,20,0,0.82) 100%)",
        }}
      >
        {/* Static label */}
        <span className="shrink-0 rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-400">
          🏆 Winners
        </span>

        {/* Scrolling track */}
        <div className="flex-1 overflow-hidden">
          <div
            className="inline-flex h-[26.5px] whitespace-nowrap"
            style={{
              animation: `gacha-ticker ${duration}s linear infinite`,
              willChange: "transform",
            }}
          >
            {items.map((w, i) => (
              <span
                key={i}
                className="inline-flex shrink-0 items-center gap-1 pr-6 text-[10px] font-semibold"
                style={{
                  color: w.isGolden ? "#FCD34D" : "#e5e7eb",
                }}
              >
                {w.isGolden ? "★" : "·"}{" "}
                <span className="font-black">{w.displayName}</span>{" "}
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
