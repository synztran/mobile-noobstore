"use client";

import { X } from "lucide-react";

interface ConfirmDialogProps {
	open: boolean;
	title: string;
	message: string;
	confirmLabel?: string;
	busy?: boolean;
	onConfirm: () => void;
	onClose: () => void;
}

export default function ConfirmDialog({
	open,
	title,
	message,
	confirmLabel = "Xoá",
	busy = false,
	onConfirm,
	onClose,
}: ConfirmDialogProps) {
	if (!open) return null;

	return (
		<div className="fixed inset-0 z-[60] !mt-0 flex items-center justify-center">
			<div
				className="absolute inset-0 bg-black/50"
				onClick={busy ? undefined : onClose}
			/>
			<div className="relative mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-800">
				<button
					onClick={onClose}
					disabled={busy}
					className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
					<X className="h-5 w-5" />
				</button>
				<h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
					{title}
				</h3>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
					{message}
				</p>
				<div className="mt-5 flex justify-end gap-2">
					<button onClick={onClose} disabled={busy} className="btn btn-ghost">
						Huỷ
					</button>
					<button onClick={onConfirm} disabled={busy} className="btn btn-error">
						{busy ? (
							<span className="loading loading-spinner loading-sm" />
						) : (
							confirmLabel
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
