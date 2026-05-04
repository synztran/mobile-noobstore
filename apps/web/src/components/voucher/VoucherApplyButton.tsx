"use client";

import { CheckCircle2, TicketPercent, X } from "lucide-react";

type VoucherApplyButtonProps = {
	isApplied: boolean;
	isApplying: boolean;
	isValid: boolean;
	onClick?: () => void;
};

export function VoucherApplyButton({
	isApplied,
	isApplying,
	isValid,
	onClick,
}: VoucherApplyButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={isApplying || isApplied || !isValid}
			className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition-colors disabled:cursor-not-allowed disabled:bg-outline disabled:opacity-50">
			{isApplied ? (
				<>
					<CheckCircle2 className="h-4 w-4" />
					Đã áp dụng
				</>
			) : isApplying ? (
				<span className="loading loading-spinner loading-xs" />
			) : !isValid ? (
				<>
					<X className="h-4 w-4" />
					Không khả dụng
				</>
			) : (
				<>
					<TicketPercent className="h-4 w-4" />
					Áp dụng
				</>
			)}
		</button>
	);
}
