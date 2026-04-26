"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const MESSAGES = [
	{ text: "MIỄN PHÍ GIAO HÀNG CHO ĐƠN TỪ 500K", href: "/shop" },
	{
		text: "SWITCH MỚI: VALERIAN LIGHT TACTILE — CÓ SẴN",
		href: "/shop?category=switches",
	},
	{ text: "NHẬN ƯU ĐÃI SỚM — ĐĂNG KÝ NGAY", href: "#newsletter" },
];

const ROTATE_INTERVAL = 3500;

export function AnnouncementBanner() {
	const [activeIdx, setActiveIdx] = useState(0);
	const [visible, setVisible] = useState(true);

	useEffect(() => {
		const timer = setInterval(() => {
			// Fade out → swap → fade in
			setVisible(false);
			setTimeout(() => {
				setActiveIdx((i) => (i + 1) % MESSAGES.length);
				setVisible(true);
			}, 300);
		}, ROTATE_INTERVAL);
		return () => clearInterval(timer);
	}, []);

	const msg = MESSAGES[activeIdx];

	return (
		<div className="w-full bg-on-surface text-surface py-2.5 px-4 flex items-center justify-center relative overflow-hidden">
			<Link
				href={msg.href}
				className={`text-[10px] font-black uppercase tracking-[0.15em] text-center transition-opacity duration-300 ${
					visible ? "opacity-100" : "opacity-0"
				}`}>
				{msg.text}
			</Link>

			{/* Dot indicators */}
			<div className="absolute right-4 flex items-center gap-1">
				{MESSAGES.map((_, i) => (
					<button
						key={i}
						aria-label={`Go to announcement ${i + 1}`}
						onClick={() => setActiveIdx(i)}
						className={`rounded-full transition-all duration-300 ${
							i === activeIdx
								? "w-3 h-1 bg-primary-fixed-dim"
								: "w-1 h-1 bg-white/30"
						}`}
					/>
				))}
			</div>
		</div>
	);
}
