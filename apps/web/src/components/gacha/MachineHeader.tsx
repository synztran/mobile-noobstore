"use client";

import { motion } from "motion/react";

export function MachineHeader() {
	return (
		<div
			className="flex flex-col items-center py-2 gap-1 rounded-t-[22px]"
			style={{
				background: "linear-gradient(180deg, #ffffff 0%, #f4f4f4 100%)",
				borderBottom: "2px solid #e4e4e4",
			}}>
			{/* Colored accent stripe — running rainbow */}
			<div
				className="w-24 rounded-full h-1 mb-0.5 overflow-hidden"
				style={{ boxShadow: "0 1px 6px rgba(96,165,250,0.4)" }}>
				<motion.div
					className="h-full"
					style={{
						width: "200%",
						background:
							"linear-gradient(90deg, #FF6B6B, #FBBF24, #34D399, #60A5FA, #A78BFA, #FF6B6B, #FBBF24, #34D399, #60A5FA, #A78BFA, #FF6B6B)",
					}}
					animate={{ x: ["0%", "-50%"] }}
					transition={{
						duration: 2.5,
						repeat: Infinity,
						ease: "linear",
						repeatType: "loop",
					}}
				/>
			</div>
			<span className="font-black tracking-[0.32em] uppercase text-[11px] text-[#777]">
				✦ Gacha Machine ✦
			</span>
			<span className="font-semibold text-[10px] text-gray-400 tracking-[0.18em]">
				Thêm token · Quay số · Nhận thưởng
			</span>
		</div>
	);
}
