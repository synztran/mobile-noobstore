"use client";

import { motion } from "motion/react";
import { LuckyBall } from "./LuckyBall";

interface BallTankProps {
	isShaking?: boolean;
}

// Deterministic seeded LCG — stable across SSR/client, looks random
function makeLcg(seed: number) {
	let s = seed >>> 0;
	return () => {
		s = Math.imul(s, 1664525) + 1013904223;
		return (s >>> 0) / 0x100000000;
	};
}

function generateBalls() {
	const rng = makeLcg(0xdeadbeef);
	const COLOR_COUNT = 11;
	const GOLD = 4;

	// Hex-grid sized for ~42px balls in a ~340px wide, 220px tall tank
	// Column spacing ~14% (≈42px), row spacing ~17% (hex-pack vertical)
	// Odd rows overflow both edges — clipped by overflow-hidden
	const evenCols = [6, 20, 34, 48, 62, 76, 90]; // 7 cols
	const oddCols = [-1, 13, 27, 41, 55, 69, 83, 97]; // 8 cols, clips left+right
	const rowYs = [8, 25, 42, 58, 75, 91]; // 6 rows

	const balls: { colorIndex: number; x: number; y: number; size: number }[] =
		[];

	const totalSlots =
		rowYs.length * evenCols.length +
		Math.floor(rowYs.length / 2) * (oddCols.length - evenCols.length);
	const goldSet = new Set<number>();
	while (goldSet.size < 7) {
		goldSet.add(Math.floor(rng() * totalSlots));
	}

	let idx = 0;
	for (let row = 0; row < rowYs.length; row++) {
		const cols = row % 2 === 0 ? evenCols : oddCols;
		for (const baseX of cols) {
			const jx = (rng() - 0.5) * 10; // ±5% jitter — looks organic, not grid
			const jy = (rng() - 0.5) * 8; // ±4% jitter
			const size = 38 + Math.round(rng() * 10); // 38–48 px — bigger balls
			const isGold = goldSet.has(idx);
			let colorIndex: number;
			if (isGold) {
				colorIndex = GOLD;
			} else {
				colorIndex = Math.floor(rng() * (COLOR_COUNT - 1));
				if (colorIndex >= GOLD) colorIndex++;
			}
			balls.push({
				colorIndex,
				x: Math.round((baseX + jx) * 10) / 10,
				y: Math.round((rowYs[row] + jy) * 10) / 10,
				size,
			});
			idx++;
		}
	}
	return balls;
}

const BALLS = generateBalls();

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
