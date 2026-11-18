"use client";

import NumberInput from "@/components/ui/NumberInput";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SERVICE_SECTIONS, type AdminService } from "./serviceTypes";

interface EditServiceModalProps {
	open: boolean;
	onClose: () => void;
	service: AdminService;
}

export default function EditServiceModal({
	open,
	onClose,
	service,
}: EditServiceModalProps) {
	const router = useRouter();
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	const [name, setName] = useState(service.name);
	const [slug, setSlug] = useState(service.slug ?? "");
	const [description, setDescription] = useState(service.description ?? "");
	const [serviceType, setServiceType] = useState(service.service_type);
	const [section, setSection] = useState(service.service_section ?? "");
	const [price, setPrice] = useState<number | null>(service.base_price);
	const [handlingDays, setHandlingDays] = useState<number | null>(
		service.handling_days,
	);
	const [estimatedDays, setEstimatedDays] = useState<number | null>(
		service.estimated_days,
	);
	const [maxEntries, setMaxEntries] = useState<number | null>(
		service.max_entries,
	);
	const [isActive, setIsActive] = useState(service.is_active);
	const [isBookable, setIsBookable] = useState(
		service.is_bookable_on_services_page,
	);

	useEffect(() => {
		if (!open) return;
		setName(service.name);
		setSlug(service.slug ?? "");
		setDescription(service.description ?? "");
		setServiceType(service.service_type);
		setSection(service.service_section ?? "");
		setPrice(service.base_price);
		setHandlingDays(service.handling_days);
		setEstimatedDays(service.estimated_days);
		setMaxEntries(service.max_entries);
		setIsActive(service.is_active);
		setIsBookable(service.is_bookable_on_services_page);
		setError("");
	}, [open, service]);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!name.trim()) {
			setError("Tên dịch vụ không được để trống.");
			return;
		}
		setSaving(true);
		setError("");

		try {
			const res = await fetch(`/api/services/${service.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: name.trim(),
					slug: slug.trim() || null,
					description: description.trim() || null,
					service_type: serviceType.trim(),
					service_section: section || null,
					base_price: price ?? 0,
					handling_days: handlingDays ?? 0,
					estimated_days: estimatedDays,
					max_entries: maxEntries,
					is_active: isActive,
					is_bookable_on_services_page: isBookable,
				}),
			});

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

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center">
			<div className="absolute inset-0 bg-black/50" />
			<div className="relative mx-4 flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-2xl ">
				<div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4 ">
					<div>
						<h2 className="text-lg font-semibold text-slate-900 ">
							Sửa thông tin dịch vụ
						</h2>
						<p className="text-sm text-slate-500 ">
							{service.name}
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
							<div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700   ">
								{error}
							</div>
						)}

						<div>
							<label className="mb-1 block text-sm font-medium text-slate-700 ">
								Tên dịch vụ *
							</label>
							<input
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								className="input-base w-full px-3 py-2"
								required
							/>
						</div>

						<div>
							<label className="mb-1 block text-sm font-medium text-slate-700 ">
								Slug
							</label>
							<input
								type="text"
								value={slug}
								onChange={(e) => setSlug(e.target.value)}
								placeholder="vd: svc-clean-keyboard"
								className="input-base w-full px-3 py-2"
							/>
						</div>

						<div>
							<label className="mb-1 block text-sm font-medium text-slate-700 ">
								Mô tả
							</label>
							<textarea
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={2}
								className="input-base w-full resize-none px-3 py-2"
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="mb-1 block text-sm font-medium text-slate-700 ">
									Loại dịch vụ (service_type)
								</label>
								<input
									type="text"
									value={serviceType}
									onChange={(e) => setServiceType(e.target.value)}
									className="input-base w-full px-3 py-2"
								/>
							</div>
							<div>
								<label className="mb-1 block text-sm font-medium text-slate-700 ">
									Nhóm hiển thị (section)
								</label>
								<select
									value={section}
									onChange={(e) => setSection(e.target.value)}
									className="input-base w-full px-3 py-2">
									{SERVICE_SECTIONS.map((s) => (
										<option key={s.value} value={s.value}>
											{s.label}
										</option>
									))}
								</select>
							</div>
						</div>

						<NumberInput
							label="Giá mặc định (₫) *"
							value={price}
							onChange={(v) => setPrice(v ?? 0)}
							min={0}
							step={1000}
						/>

						<div className="grid grid-cols-3 gap-4">
							<NumberInput
								label="Ngày xử lý *"
								value={handlingDays}
								onChange={(v) => setHandlingDays(v ?? 0)}
								min={0}
								step={1}
							/>
							<NumberInput
								label="Ước tính (ngày)"
								value={estimatedDays}
								onChange={(v) => setEstimatedDays(v)}
								min={0}
								step={1}
							/>
							<NumberInput
								label="SL tối đa / đơn"
								value={maxEntries}
								onChange={(v) => setMaxEntries(v)}
								min={0}
								step={1}
							/>
						</div>

						<div className="flex items-center gap-6 pt-1">
							<label className="flex cursor-pointer items-center gap-2">
								<input
									type="checkbox"
									className="toggle toggle-primary toggle-sm"
									checked={isActive}
									onChange={(e) => setIsActive(e.target.checked)}
								/>
								<span className="text-sm text-slate-700 ">
									Đang hoạt động
								</span>
							</label>
							<label className="flex cursor-pointer items-center gap-2">
								<input
									type="checkbox"
									className="toggle toggle-primary toggle-sm"
									checked={isBookable}
									onChange={(e) => setIsBookable(e.target.checked)}
								/>
								<span className="text-sm text-slate-700 ">
									Bookable trên storefront
								</span>
							</label>
						</div>
					</div>

					<div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-6 py-4 ">
						<button type="button" onClick={onClose} className="btn btn-ghost">
							Huỷ
						</button>
						<button type="submit" disabled={saving} className="btn btn-primary">
							{saving ? (
								<span className="loading loading-spinner loading-sm" />
							) : (
								"Lưu thay đổi"
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
