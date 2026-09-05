"use client";

import { BALL_PALETTE } from "@/constants/gacha";
import { AnimatePresence, motion } from "motion/react";
import LuckyBall from "./LuckyBall";

interface OutputTrayProps {
	isOpen: boolean;
	rewardColorIndex: number | null;
	isClickable?: boolean;
	onBallClick?: () => void;
}

export function OutputTray({
	isOpen,
	rewardColorIndex,
	isClickable,
	onBallClick,
}: OutputTrayProps) {
	return (
		<div
			className="relative flex items-end justify-center overflow-hidden w-[110px] h-28 rounded-b-2xl"
			style={{
				background: "linear-gradient(180deg, #222 0%, #111 100%)",
				border: "2.5px solid #333",
				borderTop: "none",
				boxShadow:
					"0 6px 16px rgba(0,0,0,0.4), inset 0 2px 4px rgba(0,0,0,0.6)",
			}}>
			{/* Tray inner glow — pulses brighter when ball arrives */}
			{isOpen && (
				<motion.div
					className="absolute inset-0 pointer-events-none"
					style={{
						background:
							"radial-gradient(ellipse at 50% 100%, rgba(251,191,36,0.5) 0%, transparent 65%)",
					}}
					initial={{ opacity: 0 }}
					animate={{ opacity: [0, 1, 0.55] }}
					transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
				/>
			)}

			{/* Door flap — slides open downward */}
			<motion.div
				className={`absolute left-2 right-2 top-0 origin-top rounded-b-lg h-12 ${isOpen ? "pointer-events-none" : ""}`}
				style={{
					background:
						"linear-gradient(180deg, #e8e8e8 0%, #c8c8c8 100%)",
					boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
				}}
				animate={{ scaleY: isOpen ? 0 : 1, opacity: isOpen ? 0 : 1 }}
				transition={{ duration: 0.25, ease: "easeOut" }}
			/>

			{/* Reward ball rolling out */}
			<AnimatePresence>
				{isOpen && rewardColorIndex !== null && (
					<motion.div
						className={`absolute bottom-3 ${isClickable ? "cursor-pointer" : ""}`}
						onClick={isClickable ? onBallClick : undefined}
						initial={{
							y: -140,
							rotate: -60,
							opacity: 0,
							scale: 0.2,
						}}
						animate={{ y: 0, rotate: 900, opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0, y: 40 }}
						transition={{
							type: "spring",
							stiffness: 300,
							damping: 7,
							delay: 0.1,
						}}>
						{/* Pulse ring — appears when API resolved and ball is clickable */}
						{isClickable && rewardColorIndex !== null && (
							<motion.div
								className="absolute inset-0 rounded-full border-2 pointer-events-none"
								style={{
									margin: -6,
									borderColor:
										BALL_PALETTE[
											rewardColorIndex %
												BALL_PALETTE.length
										].top,
								}}
								animate={{
									scale: [1, 1.7, 1],
									opacity: [0.9, 0, 0.9],
								}}
								transition={{
									duration: 1,
									repeat: Infinity,
									ease: "easeOut",
								}}
							/>
						)}
						{/* Landing flash — bursts as ball hits the tray floor */}
						<motion.div
							className="absolute -inset-4 rounded-full pointer-events-none"
							style={{
								background:
									"radial-gradient(circle, rgba(255,220,60,0.9) 0%, transparent 70%)",
							}}
							initial={{ scale: 0, opacity: 0 }}
							animate={{
								scale: [0, 2.6, 0],
								opacity: [0, 0.95, 0],
							}}
							transition={{
								duration: 0.56,
								delay: 0.85,
								ease: "easeOut",
							}}
						/>
						<motion.div
							animate={{
								rotate: [0, 18, -18, 13, -13, 7, -7, 0],
								scale: [1, 1.12, 0.95, 1.08, 0.98, 1],
							}}
							transition={{
								duration: 0.9,
								delay: 0.95,
								repeat: Infinity,
								repeatDelay: 1.2,
							}}>
							<LuckyBall
								colorIndex={rewardColorIndex}
								size={46}
							/>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Tray floor lip */}
			<div
				className="absolute bottom-0 left-0 right-0 h-1.5 rounded-b-2xl"
				style={{
					background:
						"linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)",
				}}
			/>
		</div>
	);
}
