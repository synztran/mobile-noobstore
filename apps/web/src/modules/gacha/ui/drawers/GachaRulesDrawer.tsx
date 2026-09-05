"use client";

import { RULES } from "@/constants/gacha";

import { useEffect } from "react";

interface GachaRulesDrawerProps {
	open: boolean;
	onClose: () => void;
}

export function GachaRulesDrawer({ open, onClose }: GachaRulesDrawerProps) {
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	if (!open) return null;

	return (
		<>
			<div
				className="fixed inset-0 bg-black/50 z-[60]"
				onClick={onClose}
			/>
			<aside
				role="dialog"
				aria-modal="true"
				aria-label="Luật chơi"
				className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-2xl bg-base-100 flex flex-col"
				style={{ maxHeight: "80vh" }}>
				{/* Header */}
				<div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-base-200">
					<p className="text-base font-black">
						Cách Thức Hoạt Động
					</p>
					<button
						aria-label="Đóng"
						onClick={onClose}
						className="rounded-xl border border-outline-variant/40 bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface transition-all active:scale-90">
						Đóng
					</button>
				</div>

				{/* Rules */}
				<div className="overflow-y-auto flex-1 px-4 py-4 flex flex-col gap-4">
					{RULES.map((rule, i) => (
						<div key={i} className="flex gap-3">
							<div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-black flex items-center justify-center mt-0.5">
								{i + 1}
							</div>
							<div>
								<p className="font-bold text-sm mb-0.5">
									{rule.title}
								</p>
								<p className="text-sm text-base-content/70 leading-relaxed">
									{rule.body}
								</p>
							</div>
						</div>
					))}

					<div className="mt-2 p-3 rounded-xl bg-warning/10 border border-warning/30">
						<p className="text-xs text-warning font-semibold text-left">
							Mọi lượt quay đều là kết quả cuối cùng. Phần thưởng
							không được đổi hoặc hoàn trả.
						</p>
					</div>
				</div>
			</aside>
		</>
	);
}
