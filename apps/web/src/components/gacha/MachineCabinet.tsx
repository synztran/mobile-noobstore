"use client";

import { motion } from "motion/react";
import { memo } from "react";
import { BallTank } from "./BallTank";
import { InsertButton } from "./InsertButton";
import { MachineActions } from "./MachineActions";
import { MachineHeader } from "./MachineHeader";
import { MachineStand } from "./MachineStand";
import { OutputTray } from "./OutputTray";
import { type GachaRewardData, RewardReveal } from "./RewardReveal";
import { RotaryKnob } from "./RotaryKnob";
import { TokenBadge } from "./TokenBadge";
import { TokenSlot } from "./TokenSlot";
import { WinnerTicker } from "./WinnerTicker";

export type Phase =
	| "idle"
	| "token-inserted"
	| "dispensing"
	| "rolling"
	| "reveal";

interface MachineCabinetProps {
	phase: Phase;
	rewardIndex: number | null;
	reward: GachaRewardData | null;
	drawError: string | null;
	tokenCount: number | null;
	eventId: number;
	onInsertToken: () => void;
	onKnobTurnComplete: () => void;
	onBallClick: () => void;
	onReset: () => void;
	onHistoryOpen: () => void;
	onRewardsOpen: () => void;
	onRulesOpen: () => void;
	onMissionsOpen: () => void;
}

export const MachineCabinet = memo(function MachineCabinet({
	phase,
	rewardIndex,
	reward,
	drawError,
	tokenCount,
	eventId,
	onInsertToken,
	onKnobTurnComplete,
	onBallClick,
	onReset,
	onHistoryOpen,
	onRewardsOpen,
	onRulesOpen,
	onMissionsOpen,
}: MachineCabinetProps) {
	const isTrayOpen = phase === "rolling" || phase === "reveal";

	return (
		<>
			{/* Winner ticker above machine */}
			<div className="w-full mb-1">
				<WinnerTicker eventId={eventId} />
			</div>

			{/* Token badge */}
			<TokenBadge tokenCount={tokenCount} />

			{/* Side action buttons */}
			<MachineActions
				onHistoryOpen={onHistoryOpen}
				onRewardsOpen={onRewardsOpen}
				onRulesOpen={onRulesOpen}
				onMissionsOpen={onMissionsOpen}
			/>

			{/* ── Machine cabinet ─────────────────────────────── */}
			<div className="relative">
				<motion.div
					className="relative flex flex-col items-stretch w-[292px] rounded-t-3xl rounded-b-[6px] mx-auto"
					style={{
						background:
							"linear-gradient(175deg, #fafafa 0%, #efefef 55%, #e2e2e2 100%)",
						borderRadius: "24px 24px 6px 6px",
						border: "2.5px solid #d0d0d0",
						boxShadow:
							"0 12px 48px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.08), inset 0 1px 2px rgba(255,255,255,0.9)",
					}}
					initial={{ scale: 0.85, opacity: 0, y: 28 }}
					animate={{ scale: 1, opacity: 1, y: 0 }}
					transition={{
						type: "spring",
						stiffness: 200,
						damping: 22,
						delay: 0.1,
					}}>
					{/* Side left highlight edge */}
					<div
						className="absolute top-6 bottom-6 left-0 rounded-l-3xl pointer-events-none w-[3px]"
						style={{
							background:
								"linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.1) 100%)",
						}}
					/>
					{/* Side right shadow edge */}
					<div
						className="absolute top-6 bottom-6 right-0 rounded-r-3xl pointer-events-none w-[3px]"
						style={{
							background:
								"linear-gradient(180deg, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.06) 100%)",
						}}
					/>

					{/* Corner bolts */}
					{[
						{ top: 8, left: 10 },
						{ top: 8, right: 10 },
					].map((pos, i) => (
						<div
							key={i}
							className="absolute rounded-full pointer-events-none w-[7px] h-[7px]"
							style={{
								background:
									"radial-gradient(circle at 35% 35%, #e0e0e0, #a0a0a0)",
								boxShadow:
									"inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 1px rgba(255,255,255,0.6)",
								...pos,
							}}
						/>
					))}

					{/* ── Top header with gradient band ── */}
					<MachineHeader />

					{/* ── Glass dome frame ── */}
					<div
						className="mx-3 mt-2 rounded-t-xl rounded-b-[4px] border-2 border-[#d0d0d0] overflow-hidden"
						style={{
							boxShadow:
								"inset 0 0 0 1px rgba(255,255,255,0.7), 0 2px 6px rgba(0,0,0,0.10)",
						}}>
						<BallTank isShaking={phase === "dispensing"} />
					</div>

					{/* ── Mid panel with decorative screws ── */}
					<div className="mx-3 my-2 flex items-center gap-2 h-2">
						<div
							className="rounded-full shrink-0 w-[7px] h-[7px]"
							style={{
								background:
									"radial-gradient(circle at 35% 35%, #e0e0e0, #a0a0a0)",
								boxShadow: "inset 0 1px 1px rgba(0,0,0,0.25)",
							}}
						/>
						<div
							className="flex-1 rounded-full h-1"
							style={{
								background:
									"linear-gradient(90deg, #d0d0d0 0%, #e8e8e8 50%, #d0d0d0 100%)",
								boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
							}}
						/>
						<div
							className="rounded-full shrink-0 w-[7px] h-[7px]"
							style={{
								background:
									"radial-gradient(circle at 35% 35%, #e0e0e0, #a0a0a0)",
								boxShadow: "inset 0 1px 1px rgba(0,0,0,0.25)",
							}}
						/>
					</div>

					{/* ── Controls: knob left, token slot right ── */}
					<div
						className="flex items-center justify-between p-4 gap-8 "
						style={{
							background:
								"linear-gradient(180deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.04) 100%)",
							borderTop: "1px solid rgba(0,0,0,0.06)",
							borderBottom: "1px solid rgba(0,0,0,0.06)",
						}}>
						<RotaryKnob
							onTurnComplete={onKnobTurnComplete}
							disabled={phase !== "token-inserted"}
						/>
						<TokenSlot
							hasToken={
								phase === "token-inserted" ||
								phase === "dispensing" ||
								phase === "reveal"
							}
						/>
					</div>

					{/* ── Insert button ── */}
					<div className="px-4 py-2">
						<InsertButton
							onClick={onInsertToken}
							disabled={
								phase !== "idle" ||
								tokenCount === null ||
								tokenCount === 0
							}
							noTokens={tokenCount === 0}
							hasToken={phase === "token-inserted"}
						/>
					</div>

					{/* ── Draw error notice ── */}
					{drawError && (
						<p className="text-[10px] text-error text-center px-4 pb-1">
							{drawError}
						</p>
					)}

					{/* ── Output tray flush at bottom ── */}
					<div className="flex justify-center pb-4">
						<OutputTray
							isOpen={isTrayOpen}
							rewardColorIndex={rewardIndex}
							isClickable={phase === "rolling"}
							onBallClick={onBallClick}
						/>
					</div>
				</motion.div>

				{/* ── Machine stand ── */}
				<MachineStand />
			</div>

			{/* ── Reward reveal overlay ── */}
			{phase === "reveal" && (
				<RewardReveal
					rewardIndex={rewardIndex}
					reward={reward}
					onReset={onReset}
				/>
			)}
		</>
	);
});
