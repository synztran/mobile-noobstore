"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { BallTank } from "./BallTank";
import { InsertButton } from "./InsertButton";
import { BALL_PALETTE } from "./LuckyBall";
import { MachineHeader } from "./MachineHeader";
import { MachineStand } from "./MachineStand";
import { OutputTray } from "./OutputTray";
import { RewardReveal } from "./RewardReveal";
import { RotaryKnob } from "./RotaryKnob";
import { TokenSlot } from "./TokenSlot";

type Phase = "idle" | "token-inserted" | "dispensing" | "rolling" | "reveal";

export function GachaMachine() {
	const [phase, setPhase] = useState<Phase>("idle");
	const [rewardIndex, setRewardIndex] = useState<number | null>(null);

	const handleInsertToken = useCallback(() => {
		if (phase !== "idle") return;
		setPhase("token-inserted");
	}, [phase]);

	const handleKnobTurnComplete = useCallback(() => {
		if (phase !== "token-inserted") return;
		const idx = Math.floor(Math.random() * BALL_PALETTE.length);
		setRewardIndex(idx);
		setPhase("dispensing");
		setTimeout(() => setPhase("rolling"), 1300); // shake ends → ball rolls out
		setTimeout(() => setPhase("reveal"), 2400); // ball settled → reveal overlay
	}, [phase]);

	const handleReset = useCallback(() => {
		setPhase("idle");
		setRewardIndex(null);
	}, []);

	const isTrayOpen = phase === "rolling" || phase === "reveal";

	useEffect(() => {
		document.body.style.position = "fixed";
		document.body.style.width = "100%";
		return () => {
			document.body.style.position = "";
		};
	}, []);

	return (
		<div className="flex flex-col items-center">
			{/* ── Machine cabinet ─────────────────────────────── */}
			<motion.div
				className="relative flex flex-col items-stretch w-[292px] rounded-t-3xl rounded-b-[6px]"
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
					{ top: 10, left: 10 },
					{ top: 10, right: 10 },
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
					className="flex items-center justify-between px-4 py-3 gap-8 pb-8"
					style={{
						background:
							"linear-gradient(180deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.04) 100%)",
						borderTop: "1px solid rgba(0,0,0,0.06)",
						borderBottom: "1px solid rgba(0,0,0,0.06)",
					}}>
					<RotaryKnob
						onTurnComplete={handleKnobTurnComplete}
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
				<div className="px-4 py-3">
					<InsertButton
						onClick={handleInsertToken}
						disabled={phase !== "idle"}
						hasToken={phase === "token-inserted"}
					/>
				</div>

				{/* ── Output tray flush at bottom ── */}
				<div className="flex justify-center pb-8">
					<OutputTray
						isOpen={isTrayOpen}
						rewardColorIndex={rewardIndex}
					/>
				</div>
			</motion.div>

			{/* ── Machine stand ── */}
			<MachineStand />

			{/* ── Reward reveal overlay ── */}
			{phase === "reveal" && (
				<RewardReveal rewardIndex={rewardIndex} onReset={handleReset} />
			)}
		</div>
	);
}
