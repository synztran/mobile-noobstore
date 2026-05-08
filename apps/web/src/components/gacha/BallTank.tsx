"use client";

import { motion } from "motion/react";
import { LuckyBall } from "./LuckyBall";

interface BallTankProps {
	isShaking?: boolean;
}

// 29 balls — 4 golden scattered for visual drama
const BALLS = [
	// Row 1 — top
	{ colorIndex: 4, x: 14, y: 12, size: 40 }, // gold
	{ colorIndex: 3, x: 30, y: 6, size: 34 },
	{ colorIndex: 2, x: 46, y: 10, size: 38 },
	{ colorIndex: 6, x: 62, y: 8, size: 36 },
	{ colorIndex: 4, x: 80, y: 14, size: 42 }, // gold
	// Row 2
	{ colorIndex: 8, x: 6, y: 26, size: 34 },
	{ colorIndex: 0, x: 22, y: 30, size: 36 },
	{ colorIndex: 10, x: 40, y: 24, size: 36 },
	{ colorIndex: 7, x: 58, y: 28, size: 38 },
	{ colorIndex: 1, x: 74, y: 24, size: 34 },
	{ colorIndex: 9, x: 90, y: 32, size: 34 },
	// Row 3 — middle
	{ colorIndex: 5, x: 8, y: 46, size: 38 },
	{ colorIndex: 1, x: 26, y: 44, size: 40 },
	{ colorIndex: 4, x: 46, y: 50, size: 38 }, // gold
	{ colorIndex: 5, x: 62, y: 44, size: 36 },
	{ colorIndex: 8, x: 80, y: 50, size: 34 },
	{ colorIndex: 6, x: 94, y: 42, size: 34 },
	// Row 4
	{ colorIndex: 9, x: 16, y: 62, size: 36 },
	{ colorIndex: 0, x: 36, y: 60, size: 34 },
	{ colorIndex: 3, x: 54, y: 66, size: 38 },
	{ colorIndex: 7, x: 70, y: 60, size: 36 },
	{ colorIndex: 2, x: 88, y: 64, size: 34 },
	// Row 5 — bottom
	{ colorIndex: 10, x: 8, y: 80, size: 36 },
	{ colorIndex: 2, x: 26, y: 78, size: 34 },
	{ colorIndex: 4, x: 44, y: 82, size: 40 }, // gold
	{ colorIndex: 6, x: 62, y: 80, size: 36 },
	{ colorIndex: 0, x: 80, y: 84, size: 34 },
	{ colorIndex: 7, x: 20, y: 92, size: 34 },
	{ colorIndex: 5, x: 56, y: 94, size: 36 },
];

export function BallTank({ isShaking = false }: BallTankProps) {
	return (
		<div
			className="relative w-full overflow-hidden h-[220px] rounded-t-2xl rounded-b-[4px]"
			style={{
				background:
					"linear-gradient(175deg, rgba(200,230,255,0.28) 0%, rgba(150,200,245,0.18) 60%, rgba(120,180,230,0.12) 100%)",
				borderRadius: "12px 12px 4px 4px",
				border: "2px solid rgba(255,255,255,0.72)",
				boxShadow:
					"inset 0 4px 16px rgba(255,255,255,0.55), inset 0 -4px 10px rgba(0,0,0,0.07), 0 2px 10px rgba(0,0,0,0.10)",
			}}>
			{/* Ambient golden glow from the golden balls */}
			<div
				className="absolute inset-0 pointer-events-none"
				style={{
					background:
						"radial-gradient(ellipse at 70% 55%, rgba(255,220,50,0.12) 0%, transparent 65%), " +
						"radial-gradient(ellipse at 15% 18%, rgba(255,220,50,0.10) 0%, transparent 50%)",
				}}
			/>

			{/* Wide left glass streak */}
			<div
				className="absolute rounded-full w-[22px] h-[110px] top-1.5 left-2.5 -rotate-[16deg] blur-[6px]"
				style={{ background: "rgba(255,255,255,0.22)" }}
			/>
			{/* Narrow left streak */}
			<div
				className="absolute rounded-full w-2 h-[60px] top-3.5 left-8 -rotate-[10deg] blur-[3px]"
				style={{ background: "rgba(255,255,255,0.18)" }}
			/>
			{/* Right edge reflection */}
			<div
				className="absolute rounded-full w-3 h-[70px] top-2.5 right-4 rotate-[14deg] blur-[5px]"
				style={{ background: "rgba(255,255,255,0.14)" }}
			/>
			{/* Top rim gloss bar */}
			<div
				className="absolute left-6 right-6 top-1.5 h-1 rounded blur-[1px]"
				style={{
					background:
						"linear-gradient(90deg, transparent, rgba(255,255,255,0.5) 30%, rgba(255,255,255,0.55) 70%, transparent)",
				}}
			/>
			{/* Bottom light */}
			<div
				className="absolute bottom-0 left-0 right-0 pointer-events-none h-7"
				style={{
					background:
						"linear-gradient(0deg, rgba(100,160,220,0.12) 0%, transparent 100%)",
				}}
			/>

			{/* Balls */}
			{BALLS.map((ball, i) => {
				// Per-ball shake: vary direction and magnitude by index
				const dir = i % 2 === 0 ? 1 : -1;
				const dx = 6 + (i % 5) * 3; // 6â18 px horizontal
				const dy = 4 + (i % 4) * 2; // 4â10 px vertical
				return (
					<motion.div
						key={i}
						className="absolute -translate-x-1/2 -translate-y-1/2"
						style={{
							left: `${ball.x}%`,
							top: `${ball.y}%`,
							zIndex: ball.colorIndex === 4 ? 2 : 1,
						}}
						animate={
							isShaking
								? {
										x: [
											0,
											dir * dx,
											-dir * dx,
											dir * dx * 0.75,
											-dir * dx * 0.55,
											dir * dx * 0.3,
											0,
										],
										y: [
											0,
											-dy,
											dy * 0.8,
											-dy * 0.55,
											dy * 0.3,
											0,
										],
								  }
								: { x: 0, y: 0 }
						}
						transition={
							isShaking
								? {
										duration: 0.85 + (i % 6) * 0.07,
										delay: (i % 7) * 0.045,
										ease: "easeInOut",
								  }
								: { duration: 0.25 }
						}>
						<LuckyBall
							colorIndex={ball.colorIndex}
							size={ball.size}
						/>
					</motion.div>
				);
			})}
		</div>
	);
}
