"use client";

import {
	animate,
	motion,
	useMotionValue,
	useMotionValueEvent,
} from "motion/react";
import { useCallback, useRef, useState } from "react";

interface RotaryKnobProps {
	onTurnComplete: () => void;
	disabled?: boolean;
}

const FULL_TURN = 360;
const SPEED_DEG_PER_FRAME = 9;
const FRAME_MS = 16;

export function RotaryKnob({
	onTurnComplete,
	disabled = false,
}: RotaryKnobProps) {
	const [isHolding, setIsHolding] = useState(false);
	const [isReversing, setIsReversing] = useState(false);
	const [progress, setProgress] = useState(0);
	const rotationMV = useMotionValue(0);
	const rafRef = useRef<number | null>(null);
	const lastTimeRef = useRef<number | null>(null);
	const totalRef = useRef(0);

	// Keep progress ring in sync with the motion value (covers hold AND spring-back)
	useMotionValueEvent(rotationMV, "change", (v) => {
		setProgress(Math.min(Math.max(v, 0), FULL_TURN) / FULL_TURN);
	});

	const stopRaf = useCallback(() => {
		if (rafRef.current !== null) {
			cancelAnimationFrame(rafRef.current);
			rafRef.current = null;
		}
		lastTimeRef.current = null;
	}, []);

	const startTurn = useCallback(() => {
		if (disabled || isReversing || rafRef.current !== null) return;
		setIsHolding(true);

		const tick = (timestamp: number) => {
			if (lastTimeRef.current === null) lastTimeRef.current = timestamp;
			const delta = Math.min(timestamp - lastTimeRef.current, 50);
			lastTimeRef.current = timestamp;

			const newTotal =
				totalRef.current + (SPEED_DEG_PER_FRAME / FRAME_MS) * delta;

			if (newTotal >= FULL_TURN) {
				// Full turn reached — snap ring to 100%, then fire and reset
				rotationMV.set(FULL_TURN);
				totalRef.current = FULL_TURN;
				stopRaf();
				setIsHolding(false);
				setTimeout(() => {
					rotationMV.set(0);
					totalRef.current = 0;
					onTurnComplete();
				}, 80);
				return;
			}

			totalRef.current = newTotal;
			rotationMV.set(newTotal);
			rafRef.current = requestAnimationFrame(tick);
		};

		rafRef.current = requestAnimationFrame(tick);
	}, [disabled, isReversing, stopRaf, rotationMV, onTurnComplete]);

	const stopTurn = useCallback(() => {
		if (!isHolding) return;
		stopRaf();
		setIsHolding(false);

		if (totalRef.current >= FULL_TURN) return; // already handled in tick

		// Incomplete — spring the knob back to start
		setIsReversing(true);
		animate(rotationMV, 0, {
			type: "spring",
			stiffness: 220,
			damping: 22,
			onComplete: () => {
				setIsReversing(false);
				totalRef.current = 0;
			},
		});
	}, [isHolding, stopRaf, rotationMV]);

	const labelText = disabled
		? ""
		: isReversing
			? "Giữ lâu hơn..."
			: isHolding
				? "Đang quay..."
				: "Giữ để quay";

	const labelColor = disabled
		? "#bbb"
		: isReversing
			? "#ef4444"
			: isHolding
				? "#f59e0b"
				: "#888";

	return (
		<div className="flex flex-col items-center gap-2 select-none relative">
			{/* Arm shaft extending left — connects machine wall to knob */}
			<div className="relative flex items-center">
				{/* Shaft */}
				<div
					className="w-[22px] h-2.5 -mr-0.5 shrink-0"
					style={{
						background:
							"linear-gradient(180deg, #c8c8c8 0%, #989898 100%)",
						borderRadius: "4px 0 0 4px",
						boxShadow:
							"0 2px 4px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.4)",
					}}
				/>

				{/* Outer housing ring */}
				<div
					className="relative flex items-center justify-center rounded-full w-[82px] h-[82px]"
					style={{
						background:
							"linear-gradient(135deg, #e0e0e0 0%, #b8b8b8 50%, #a0a0a0 100%)",
						boxShadow:
							"0 6px 16px rgba(0,0,0,0.32), inset 0 2px 4px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.15)",
						// outline: "2.5px solid #909090",
					}}>
					{/* Housing ring tick marks */}
					{[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
						<div
							key={angle}
							className="absolute w-0.5 h-[5px] top-[3px] left-1/2 rounded-sm"
							style={{
								transformOrigin: "1px 38px",
								transform: `translateX(-50%) rotate(${angle}deg)`,
								background: "rgba(255,255,255,0.45)",
							}}
						/>
					))}

					<svg
						className="absolute inset-0"
						width={82}
						height={82}
						style={{ transform: "rotate(-90deg)" }}>
						<circle
							cx={41}
							cy={41}
							r={34}
							fill="none"
							stroke="rgba(0,0,0,0.12)"
							strokeWidth={5}
						/>
						<circle
							cx={41}
							cy={41}
							r={34}
							fill="none"
							stroke={
								disabled
									? "rgba(255,255,255,0.12)"
									: isReversing
										? "rgba(239,68,68,0.7)"
										: isHolding
											? "#f59e0b"
											: "rgba(245,158,11,0.5)"
							}
							strokeWidth={5}
							strokeDasharray={`${2 * Math.PI * 34}`}
							strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress)}`}
							strokeLinecap="round"
						/>
						{/* Glow layer */}
						{!disabled && (isHolding || isReversing) && (
							<circle
								cx={41}
								cy={41}
								r={34}
								fill="none"
								stroke={isReversing ? "#ef4444" : "#f59e0b"}
								strokeWidth={3}
								strokeOpacity={0.3}
								strokeDasharray={`${2 * Math.PI * 34}`}
								strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress)}`}
								strokeLinecap="round"
								style={{ filter: "blur(4px)" }}
							/>
						)}
					</svg>

					{/* Inner knob face */}
					<motion.div
						className={`relative flex items-center justify-center rounded-full w-[60px] h-[60px] touch-none select-none ${disabled ? "cursor-not-allowed" : "cursor-grab"}`}
						style={{
							rotate: rotationMV,
							background: isHolding
								? "linear-gradient(135deg, #e8e8e8 0%, #cccccc 100%)"
								: "linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)",
							boxShadow: isHolding
								? "0 1px 4px rgba(0,0,0,0.18), inset 0 2px 4px rgba(0,0,0,0.10)"
								: "0 4px 12px rgba(0,0,0,0.22), inset 0 2px 4px rgba(255,255,255,0.92)",
						}}
						onMouseDown={startTurn}
						onMouseUp={stopTurn}
						onMouseLeave={stopTurn}
						onTouchStart={startTurn}
						onTouchEnd={stopTurn}
						onContextMenu={(e) => e.preventDefault()}
						onDragStart={(e) => e.preventDefault()}>
						{/* Top indicator pip */}
						<div
							className="absolute rounded-full w-2.5 h-2.5 top-1.5 left-1/2 -translate-x-1/2"
							style={{
								background: disabled
									? "#c8c8c8"
									: "radial-gradient(circle at 35% 35%, #fde68a, #f59e0b)",
								boxShadow: disabled
									? "none"
									: "0 0 8px #f59e0baa, 0 0 2px #f59e0b",
								border: disabled
									? "1px solid #bbb"
									: "1.5px solid #d97706",
							}}
						/>

						{/* 6 radial grip ridges — origin at knob center (30px from top of 60px circle) */}
						{[0, 60, 120, 180, 240, 300].map((angle) => (
							<div
								key={angle}
								className="absolute rounded-full w-1 h-[14px] top-1/2 left-1/2 -ml-0.5 -mt-[30px]"
								style={{
									transformOrigin: "2px 30px",
									transform: `rotate(${angle}deg)`,
									background:
										"linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(180,180,180,0.3) 100%)",
								}}
							/>
						))}

						{/* Center hub circle */}
						<div
							className="rounded-full w-4 h-4 border border-[#bbb]"
							style={{
								background:
									"linear-gradient(135deg, #e8e8e8 0%, #c8c8c8 100%)",
								boxShadow:
									"inset 0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(255,255,255,0.8)",
							}}
						/>
					</motion.div>
				</div>
			</div>

			{/* <p
				className="text-[8px] font-black uppercase tracking-widest text-center absolute -bottom-5 left-1/2 -translate-x-1/2 w-full"
				style={{ color: labelColor }}>
				{labelText}
			</p> */}
		</div>
	);
}
