"use client";

import type { SortOption } from "@/modules/products/types";
import { CircleCheck } from "lucide-react";
import { SORT_OPTIONS } from "@/constants/shop";

interface SortSheetProps {
	isOpen: boolean;
	current: SortOption;
	onSelect: (v: SortOption) => void;
	onClose: () => void;
}

export function SortSheet({
	isOpen,
	current,
	onSelect,
	onClose,
}: SortSheetProps) {
	return (
		<>
			{/* Backdrop */}
			<div
				className={`fixed inset-0 bg-on-surface/30 backdrop-blur-sm z-[60] transition-opacity duration-300 ${
					isOpen
						? "opacity-100 pointer-events-auto"
						: "opacity-0 pointer-events-none"
				}`}
			/>

			{/* Sheet — slides from bottom */}
			<div
				className={`fixed left-0 right-0 z-[70] bg-white rounded-t-3xl shadow-2xl overflow-hidden transition-all duration-300 ease-out ${
					isOpen ? "bottom-0" : "bottom-[-110%]"
				}`}>
				<div className="flex justify-between items-center px-6 py-5 border-b border-outline-variant/20">
					<p className="text-lg font-black text-on-surface">
						Sắp xếp theo
					</p>
					<button
						onClick={onClose}
						className="rounded-xl border border-outline-variant/40 bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface transition-all active:scale-90">
						Đóng
					</button>
				</div>
				<div className="p-4 space-y-2 pb-8">
					{SORT_OPTIONS.map((opt) => (
						<button
							key={opt.value}
							onClick={() => {
								onSelect(opt.value);
								onClose();
							}}
							className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-colors ${
								current === opt.value
									? "bg-primary/10 text-primary"
									: "bg-surface-container-low text-on-surface hover:bg-surface-container"
							}`}>
							{opt.icon}
							<span className="font-bold text-sm">
								{opt.label}
							</span>
						{current === opt.value && (
							<CircleCheck className="ml-auto h-5 w-5 text-primary" />
						)}
						</button>
					))}
				</div>
			</div>
		</>
	);
}
