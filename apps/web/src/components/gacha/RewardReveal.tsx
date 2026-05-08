"use client";

import { AnimatePresence, motion } from "motion/react";
import { LuckyBall } from "./LuckyBall";

export interface GachaRewardData {
	id: number;
	reward_type: "product" | "point" | "puzzle" | "lucky_text";
	name: string;
	description: string | null;
	value: string | null;
	thumbnail_url: string | null;
	is_golden: boolean;
}

const REWARD_TYPE_LABEL: Record<string, string> = {
	product: "Sản phẩm",
	point: "Điểm",
	puzzle: "Mảnh ghép",
	lucky_text: "Tin nhắn may mắn",
};

interface RewardRevealProps {
	rewardIndex: number | null;
	reward: GachaRewardData | null;
	onReset: () => void;
}

export function RewardReveal({
	rewardIndex,
	reward,
	onReset,
}: RewardRevealProps) {
	const isGolden = reward?.is_golden ?? false;

	return (
		<AnimatePresence>
			{rewardIndex !== null && (
				<motion.div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/[72%] backdrop-blur-[6px]"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}>
					{/* ── Golden celebration: screen flash ── */}
					{isGolden && (
						<motion.div
							className="absolute inset-0 pointer-events-none bg-[rgba(255,220,50,0.18)]"
							initial={{ opacity: 0 }}
							animate={{ opacity: [0, 1, 0] }}
							transition={{ duration: 0.5, delay: 0.05 }}
						/>
					)}

					{/* ── Golden celebration: radiating rays ── */}
					{isGolden &&
						[...Array(12)].map((_, i) => (
							<motion.div
								key={`ray-${i}`}
								className="absolute pointer-events-none w-[3px] top-1/2 left-1/2 origin-top rounded-[2px]"
								style={{
									height: "45vmax",
									transform: `translateX(-50%) rotate(${i * 30}deg)`,
									background:
										"linear-gradient(180deg, rgba(255,220,50,0.55) 0%, transparent 100%)",
								}}
								initial={{ scaleY: 0, opacity: 0 }}
								animate={{
									scaleY: [0, 1, 0.85, 1],
									opacity: [0, 0.7, 0.4, 0.7],
								}}
								transition={{
									duration: 2.4,
									delay: 0.2 + (i % 3) * 0.08,
									repeat: Infinity,
									ease: "easeInOut",
								}}
							/>
						))}

					{/* ── Confetti burst (one-shot) ── */}
					{[...Array(isGolden ? 36 : 20)].map((_, i) => {
						const angle = (i / (isGolden ? 36 : 20)) * 360;
						const distance = 90 + (i % 5) * 28;
						const goldenColors = [
							"#FFE566",
							"#FBBF24",
							"#FCD34D",
							"#FDE68A",
							"#ffffff",
							"#F59E0B",
						];
						const normalColors = [
							"#FFE566",
							"#FF6B6B",
							"#4ECDC4",
							"#C084FC",
							"#34D399",
							"#93C5FD",
						];
						const colors = isGolden ? goldenColors : normalColors;
						return (
							<motion.div
								key={`burst-${i}`}
								className="absolute pointer-events-none top-1/2 left-1/2"
								style={{
									width: isGolden
										? 8 + (i % 3) * 4
										: 6 + (i % 3) * 3,
									height: isGolden
										? 8 + (i % 3) * 4
										: 6 + (i % 3) * 3,
									borderRadius: i % 2 === 0 ? "50%" : 2,
									background: colors[i % colors.length],
								}}
								initial={{
									x: 0,
									y: 0,
									opacity: 1,
									scale: 1,
									rotate: 0,
								}}
								animate={{
									x:
										Math.cos((angle * Math.PI) / 180) *
										distance,
									y:
										Math.sin((angle * Math.PI) / 180) *
										distance,
									opacity: [1, 1, 0],
									scale: [1, 0.8, 0],
									rotate: angle * 2,
								}}
								transition={{
									duration: 1.1,
									delay: 0.1,
									ease: "easeOut",
								}}
							/>
						);
					})}

					{/* ── Golden celebration: looping falling sparkles ── */}
					{isGolden &&
						[...Array(18)].map((_, i) => (
							<motion.div
								key={`spark-${i}`}
								className="absolute pointer-events-none text-base"
								style={{
									left: `${5 + ((i * 5.5) % 90)}%`,
									top: -20,
								}}
								animate={{
									y: ["0vh", "110vh"],
									opacity: [0, 1, 1, 0],
									rotate: [0, 360],
								}}
								transition={{
									duration: 2.2 + (i % 5) * 0.4,
									delay: (i * 0.18) % 2.2,
									repeat: Infinity,
									ease: "linear",
								}}>
								{["✦", "★", "◆", "✦"][i % 4]}
							</motion.div>
						))}

					<motion.div
						className="relative flex flex-col items-center gap-5 mx-6 rounded-[28px] p-6 border-2 border-white/80 min-w-[240px] z-[1]"
						style={{
							background: isGolden
								? "linear-gradient(155deg, #fffbeb 0%, #fef3c7 100%)"
								: "linear-gradient(155deg, #fff 0%, #f8f8f8 100%)",
							boxShadow: isGolden
								? "0 20px 60px rgba(245,158,11,0.35), 0 0 0 2px #FBBF24"
								: "0 20px 60px rgba(0,0,0,0.30), 0 0 0 2px rgba(255,255,255,0.8)",
						}}
						initial={{ scale: 0.4, rotate: -12, opacity: 0 }}
						animate={{ scale: 1, rotate: 0, opacity: 1 }}
						exit={{ scale: 0.2, opacity: 0 }}
						transition={{
							type: "spring",
							stiffness: 320,
							damping: 22,
						}}>
						{/* Sparkle star bursts in corners */}
						{[
							{ top: -12, left: -12, fontSize: 22 },
							{ top: -8, right: -8, fontSize: 16 },
							{ bottom: -8, left: -8, fontSize: 18 },
							{ bottom: -12, right: -12, fontSize: 24 },
						].map((style, i) => (
							<motion.span
								key={i}
								className="absolute pointer-events-none"
								style={{ ...style, lineHeight: 1 }}
								animate={{
									scale: [0.6, 1.3, 0.6],
									rotate: [0, 30, -30, 0],
									opacity: [0.7, 1, 0.7],
								}}
								transition={{
									duration: 1.4,
									delay: i * 0.18,
									repeat: Infinity,
								}}>
								✨
							</motion.span>
						))}

						<p className="font-black uppercase tracking-[0.25em] text-[10px] text-[#aaa]">
							Bạn nhận được!
						</p>

						{/* Glowing ball */}
						<div className="relative flex items-center justify-center">
							{isGolden && (
								<motion.div
									className="absolute rounded-full w-[110px] h-[110px]"
									style={{
										background:
											"radial-gradient(circle, rgba(255,220,50,0.35) 0%, transparent 70%)",
									}}
									animate={{
										scale: [1, 1.2, 1],
										opacity: [0.7, 1, 0.7],
									}}
									transition={{
										duration: 1.6,
										repeat: Infinity,
									}}
								/>
							)}
							<motion.div
								animate={{
									rotate: [0, 15, -15, 10, -10, 0],
									scale: [1, 1.18, 1],
								}}
								transition={{ duration: 0.65, delay: 0.2 }}>
								<LuckyBall colorIndex={rewardIndex} size={92} />
							</motion.div>
						</div>

						<div className="flex flex-col items-center gap-1">
							{reward === null ? (
								<span className="loading loading-spinner loading-md text-base-content/40" />
							) : (
								<>
									<p className="font-black text-xl text-[#1a1a1a] text-center">
										{reward.name}
									</p>
									{reward.value && (
										<p className="font-bold text-sm text-primary text-center">
											{reward.reward_type === "point"
												? `+${reward.value} điểm`
												: reward.value}
										</p>
									)}
									<p
										className="font-semibold px-3 py-0.5 rounded-full text-[10px] tracking-[0.12em] mt-0.5"
										style={{
											color: isGolden
												? "#92400e"
												: "#888",
											background: isGolden
												? "rgba(251,191,36,0.2)"
												: "rgba(0,0,0,0.05)",
										}}>
										{isGolden
											? "★ VẬT PHẨM HIẾM ★"
											: (REWARD_TYPE_LABEL[
													reward.reward_type
												] ?? "Vật phẩm capsule")}
									</p>
								</>
							)}
						</div>

						<motion.button
							type="button"
							onClick={onReset}
							className="font-black uppercase tracking-[0.14em] text-white h-[46px] px-7 rounded-[14px] text-xs border-0 cursor-pointer"
							style={{
								background:
									"linear-gradient(145deg, #1a1a1a, #333)",
								boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
							}}
							whileTap={{ scale: 0.95 }}>
							Thử lại
						</motion.button>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
