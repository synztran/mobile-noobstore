"use client";

import NumberInput from "@/components/ui/NumberInput";
import { formatVND } from "@/lib/currency";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import type { AdminOptionValue } from "./serviceTypes";

interface ServiceValueModalProps {
	open: boolean;
	onClose: () => void;
	optionId: number;
	optionLabel: string;
	value: AdminOptionValue | null;
}

export default function ServiceValueModal({
	open,
	onClose,
	optionId,
	optionLabel,
	value,
}: ServiceValueModalProps) {
	const router = useRouter();
	const isEdit = value !== null;

	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [confirmingDelete, setConfirmingDelete] = useState(false);
	const [error, setError] = useState("");
	const [label, setLabel] = useState("");
	const [priceAdjustment, setPriceAdjustment] = useState<number | null>(0);
	const [displayOrder, setDisplayOrder] = useState<number | null>(0);

	useEffect(() => {
		if (!open) return;
		setLabel(value?.label ?? "");
		setPriceAdjustment(value?.price_adjustment ?? 0);
		setDisplayOrder(value?.display_order ?? 0);
		setError("");
	}, [open, value]);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!label.trim()) {
			setError("Nhãn giá trị không được để trống.");
			return;
		}
		setSaving(true);
		setError("");

		try {
			const res = await fetch(
				isEdit
					? `/api/service-option-values/${value!.id}`
					: "/api/service-option-values",
				{
					method: isEdit ? "PATCH" : "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						label: label.trim(),
						price_adjustment: priceAdjustment ?? 0,
						display_order: displayOrder ?? 0,
						...(isEdit ? {} : { option_id: optionId }),
					}),
				},
			);

			if (!res.ok) {
				const body = await res.json();
				throw new Error(body.error ?? "Failed to save");
			}

			router.refresh();
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setSaving(false);
		}
	}

	async function handleDelete() {
		if (!value) return;
		setDeleting(true);
		setError("");

		try {
			const res = await fetch(`/api/service-option-values/${value.id}`, {
				method: "DELETE",
			});
			if (!res.ok) {
				const body = await res.json();
				throw new Error(body.error ?? "Failed to delete");
			}
			router.refresh();
			setConfirmingDelete(false);
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
			setConfirmingDelete(false);
		} finally {
			setDeleting(false);
		}
	}

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center">
			<div className="absolute inset-0 bg-black/50" />
			<div className="relative mx-4 flex max-h-[90vh] w-full max-w-md flex-col rounded-xl bg-white shadow-2xl dark:bg-slate-800">
				<div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
					<div>
						<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
							{isEdit ? "Sửa giá trị" : "Thêm giá trị"}
						</h2>
						<p className="text-sm text-slate-500 dark:text-slate-400">
							Tuỳ chọn: {optionLabel}
						</p>
					</div>
					<button
						onClick={onClose}
						className="text-slate-400 hover:text-slate-600">
						<X className="h-5 w-5" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
					<div className="flex-1 space-y-4 overflow-y-auto p-6">
						{error && (
							<div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
								{error}
							</div>
						)}

						<div>
							<label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
								Nhãn giá trị *
							</label>
							<input
								type="text"
								value={label}
								onChange={(e) => setLabel(e.target.value)}
								placeholder="vd: Cherry"
								className="input-base w-full px-3 py-2"
								required
							/>
						</div>

						<NumberInput
							label="Điều chỉnh giá (₫)"
							subLabel="Âm để giảm giá, dương để cộng thêm"
							value={priceAdjustment}
							onChange={(v) => setPriceAdjustment(v ?? 0)}
							step={1000}
						/>
						<p className="text-right text-xs text-slate-400 dark:text-slate-500">
							{(priceAdjustment ?? 0) > 0 ? "+" : ""}
							{formatVND(priceAdjustment ?? 0)}
						</p>

						<NumberInput
							label="Thứ tự hiển thị"
							value={displayOrder}
							onChange={(v) => setDisplayOrder(v ?? 0)}
							min={0}
							step={1}
						/>
					</div>

					<div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
						{isEdit ? (
							<button
								type="button"
								onClick={() => setConfirmingDelete(true)}
								disabled={deleting}
								className="btn btn-error btn-outline btn-sm">
								Xoá
							</button>
						) : (
							<span />
						)}
						<div className="flex gap-2">
							<button
								type="button"
								onClick={onClose}
								className="btn btn-ghost">
								Huỷ
							</button>
							<button
								type="submit"
								disabled={saving}
								className="btn btn-primary">
								{saving ? (
									<span className="loading loading-spinner loading-sm" />
								) : isEdit ? (
									"Lưu thay đổi"
								) : (
									"Thêm giá trị"
								)}
							</button>
						</div>
					</div>
				</form>

				<ConfirmDialog
					open={confirmingDelete}
					title="Xoá giá trị?"
					message={`Giá trị "${value?.label}" sẽ bị xoá vĩnh viễn.`}
					busy={deleting}
					onConfirm={handleDelete}
					onClose={() => setConfirmingDelete(false)}
				/>
			</div>
		</div>
	);
}
