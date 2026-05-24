"use client";

import { motion } from "motion/react";
import { memo } from "react";

export const BALL_PALETTE = [
	{ top: "#FF6B6B", bottom: "#FF3A1A", name: "Flame", glow: "#FF6B6B" },
	{ top: "#4ECDC4", bottom: "#1A8FD1", name: "Ocean", glow: "#4ECDC4" },
	{ top: "#C084FC", bottom: "#EC4899", name: "Cosmic", glow: "#C084FC" },
	{ top: "#34D399", bottom: "#047857", name: "Forest", glow: "#34D399" },
	{
		top: "#FFE566",
		bottom: "#F59E0B",
		name: "Gold",
		glow: "#FFE566",
		isGolden: true,
	},
	{ top: "#F9A8D4", bottom: "#A855F7", name: "Rose", glow: "#F9A8D4" },
	{ top: "#93C5FD", bottom: "#2563EB", name: "Sky", glow: "#93C5FD" },
	{ top: "#FB923C", bottom: "#DC2626", name: "Lava", glow: "#FB923C" },
	{ top: "#F0ABFC", bottom: "#7C3AED", name: "Mystic", glow: "#F0ABFC" },
	{ top: "#6EE7B7", bottom: "#0891B2", name: "Aqua", glow: "#6EE7B7" },
	{ top: "#FCD34D", bottom: "#EF4444", name: "Solar", glow: "#FCD34D" },
];

interface LuckyBallProps {
	colorIndex: number;
	size?: number;
	floating?: boolean;
	floatDelay?: number;
}

const LuckyBall = ({
	colorIndex,
	size = 42,
	floating = false,
	floatDelay = 0,
}: LuckyBallProps) => {
	const color = BALL_PALETTE[colorIndex % BALL_PALETTE.length];
	const isGolden = Boolean(color.isGolden);

	return (
		<motion.div
			className="relative flex-shrink-0"
			style={{ width: size, height: size }}
			animate={
				floating ? { y: [0, -8, 0], rotate: [0, 6, -6, 0] } : undefined
			}
			transition={
				floating
					? {
							duration: 2.6 + floatDelay * 0.35,
							repeat: Infinity,
							ease: "easeInOut",
							delay: floatDelay,
						}
					: undefined
			}>
			{/* Golden outer glow ring */}
			{isGolden && (
				<motion.div
					className="absolute inset-0 rounded-full pointer-events-none"
					style={{
						margin: -size * 0.18,
						boxShadow: `0 0 ${size * 0.5}px ${size * 0.25}px #FFE56688, 0 0 ${size * 0.9}px ${size * 0.1}px #F59E0B44`,
						borderRadius: "50%",
					}}
					animate={{
						opacity: [0.6, 1, 0.6],
						scale: [0.95, 1.08, 0.95],
					}}
					transition={{
						duration: 1.6,
						repeat: Infinity,
						ease: "easeInOut",
						delay: floatDelay,
					}}
				/>
			)}

			{/* Ball body */}
			<div
				className="absolute inset-0 rounded-full"
				style={{
					boxShadow: isGolden
						? `0 4px 18px #F59E0B88, 0 0 8px #FFE56666, inset 0 -4px 8px rgba(0,0,0,0.22)`
						: `0 4px 14px ${color.glow}55, inset 0 -3px 8px rgba(0,0,0,0.22)`,
				}}
			/>

			{/* Top half */}
			<div
				className="absolute left-0 right-0 top-0 rounded-t-full"
				style={{
					height: "52%",
					background: isGolden
						? `linear-gradient(145deg, #FFF176 0%, #FFE566 30%, ${color.top} 65%, ${color.bottom} 100%)`
						: `linear-gradient(145deg, ${color.top} 0%, ${color.bottom} 100%)`,
				}}
			/>
			{/* Bottom half */}
			<div
				className="absolute bottom-0 left-0 right-0 rounded-b-full"
				style={{
					height: "52%",
					background: isGolden
						? `linear-gradient(180deg, ${color.bottom} 0%, #D97706 100%)`
						: color.bottom,
					opacity: isGolden ? 1 : 0.88,
				}}
			/>
			{/* Center seam */}
			<div
				className="absolute left-1 right-1"
				style={{
					height: 2,
					top: "48%",
					background: isGolden
						? "rgba(255,255,255,0.55)"
						: "rgba(255,255,255,0.30)",
					boxShadow: isGolden
						? "0 0 4px rgba(255,255,200,0.6)"
						: "none",
				}}
			/>
			{/* Large shine */}
			<div
				className="absolute rounded-full"
				style={{
					width: "38%",
					height: "24%",
					top: "11%",
					left: "16%",
					background: isGolden
						? "rgba(255,255,240,0.82)"
						: "rgba(255,255,255,0.58)",
				}}
			/>
			{/* Small secondary shine */}
			<div
				className="absolute rounded-full"
				style={{
					width: "16%",
					height: "12%",
					top: "18%",
					right: "18%",
					background: "rgba(255,255,255,0.35)",
				}}
			/>

			{/* Golden rotating star glint */}
			{isGolden && (
				<motion.div
					className="absolute inset-0 rounded-full pointer-events-none overflow-hidden"
					style={{ borderRadius: "50%" }}>
					<motion.div
						className="absolute"
						style={{
							width: "160%",
							height: "160%",
							top: "-30%",
							left: "-80%",
							background:
								"linear-gradient(90deg, transparent 0%, rgba(255,255,220,0.55) 50%, transparent 100%)",
							transform: "rotate(-30deg)",
						}}
						animate={{ left: ["-80%", "80%"] }}
						transition={{
							duration: 1.8,
							repeat: Infinity,
							repeatDelay: 1.4,
							ease: "easeInOut",
							delay: floatDelay * 0.5,
						}}
					/>
				</motion.div>
			)}
		</motion.div>
	);
};

export default memo(LuckyBall);
