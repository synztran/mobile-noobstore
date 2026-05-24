"use client";

import { motion, useAnimationFrame, useMotionValue } from "motion/react";
import { memo, useRef } from "react";

interface InsertButtonProps {
	onClick: () => void;
	disabled?: boolean;
	hasToken?: boolean;
	noTokens?: boolean;
}

export const InsertButton = ({
	onClick,
	disabled = false,
	hasToken = false,
	noTokens = false,
}: InsertButtonProps) => {
	const bg = hasToken
		? "linear-gradient(145deg, #4ade80 0%, #16a34a 100%)"
		: "linear-gradient(145deg, #fbbf24 0%, #d97706 100%)";

	const glow = hasToken
		? "0 5px 22px rgba(74,222,128,0.48), 0 2px 6px rgba(0,0,0,0.12)"
		: "0 5px 22px rgba(251,191,36,0.48), 0 2px 6px rgba(0,0,0,0.12)";

	const sweepGradient = hasToken
		? "conic-gradient(from 0deg, transparent 0%, #4ade80 18%, #bbf7d0 22%, #4ade80 26%, transparent 44%)"
		: "conic-gradient(from 0deg, transparent 0%, #fbbf24 18%, #fef9c3 22%, #fbbf24 26%, transparent 44%)";

	// Drive rotation with rAF — never resets to 0, speed lerps on hasToken change
	const rotateMV = useMotionValue(0);
	const speedRef = useRef(360 / 2200); // deg/ms

	useAnimationFrame((_, delta) => {
		if (disabled) return;
		const target = 360 / (hasToken ? 1400 : 2200);
		speedRef.current += (target - speedRef.current) * 0.08;
		rotateMV.set(rotateMV.get() + speedRef.current * delta);
	});

	return (
		<div className="relative w-full">
			{/* Running border wrapper — overflow:hidden clips the spinning gradient */}
			<div
				className={`relative overflow-hidden rounded-2xl ${disabled ? "p-0" : "p-0.5"}`}
				style={{
					boxShadow: disabled ? "none" : glow,
				}}>
				{/* Spinning gradient — always mounted, rAF-driven, hidden when disabled */}
				<motion.div
					className="absolute pointer-events-none w-[300%] h-[300%] -top-full -left-full"
					style={{
						background: sweepGradient,
						rotate: rotateMV,
						opacity: disabled ? 0 : 1,
					}}
				/>

				{/* Button sits above the gradient on z-index 1 */}
				<motion.button
					type="button"
					onClick={onClick}
					disabled={disabled}
					className={`relative w-full flex items-center justify-center gap-2 font-black text-sm uppercase text-white select-none h-10 rounded-[14px] z-[1] border-0 tracking-[0.12em] ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
					style={{
						background: disabled
							? "linear-gradient(145deg, #d0d0d0, #b8b8b8)"
							: bg,
						boxShadow: disabled
							? "inset 0 2px 4px rgba(0,0,0,0.12)"
							: "inset 0 1px 2px rgba(255,255,255,0.25)",
					}}
					whileTap={disabled ? {} : { scale: 0.96, y: 2 }}
					transition={{
						type: "spring",
						stiffness: 500,
						damping: 30,
					}}>
					{/* Top gloss bar */}
					{/* {!disabled && (
						<div className="absolute inset-x-5 top-1.5 rounded-full h-2 bg-white/30 blur-[2px]" />
					)} */}
					{/* Bottom depth shadow */}
					{/* {!disabled && (
						<div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/[12%] rounded-b-xl" />
					)} */}

					<div className="text-xs">
						{hasToken ? (
							"Quay thôi"
						) : noTokens ? (
							"Không đủ token"
						) : (
							<div className="relative flex items-center justify-center">
								Tham gia
							</div>
						)}
					</div>
				</motion.button>
			</div>
		</div>
	);
};

export default memo(InsertButton);
