"use client";

import { motion } from "motion/react";

export function MachineStand() {
	return (
		<motion.div
			className="relative rounded-b-xl overflow-hidden"
			style={{
				width: 340,
				height: 22,
				background:
					"linear-gradient(180deg, #c6c6c6 0%, #a4a4a4 55%, #929292 100%)",
				boxShadow:
					"0 10px 28px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.55)",
			}}
			initial={{ opacity: 0, scaleX: 0.78, y: 16 }}
			animate={{ opacity: 1, scaleX: 1, y: 0 }}
			transition={{
				type: "spring",
				stiffness: 200,
				damping: 22,
				delay: 0.1,
			}}>
			{/* Top highlight */}
			<div className="absolute inset-x-0 top-0 h-px bg-white/50" />
			{/* Bottom darkening strip */}
			<div
				className="absolute inset-x-0 bottom-0 h-1 rounded-b-xl"
				style={{ background: "rgba(0,0,0,0.14)" }}
			/>
			{/* Left foot pad */}
			<div
				className="absolute left-5 bottom-0 w-10 h-3 rounded-b-lg"
				style={{
					background:
						"linear-gradient(180deg, #969696 0%, #787878 100%)",
					boxShadow: "0 3px 8px rgba(0,0,0,0.28)",
				}}
			/>
			{/* Right foot pad */}
			<div
				className="absolute right-5 bottom-0 w-10 h-3 rounded-b-lg"
				style={{
					background:
						"linear-gradient(180deg, #969696 0%, #787878 100%)",
					boxShadow: "0 3px 8px rgba(0,0,0,0.28)",
				}}
			/>
			{/* Centre shadow under cabinet edge */}
			<div
				className="absolute inset-x-12 top-0 h-2 pointer-events-none"
				style={{
					background:
						"linear-gradient(180deg, rgba(0,0,0,0.10) 0%, transparent 100%)",
				}}
			/>
		</motion.div>
	);
}
