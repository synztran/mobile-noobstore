"use client";

import clsx from "clsx";
import { ImagePlus, Loader2, X } from "lucide-react";
import Image from "@/components/ui/AdaptiveImage";
import { useRef, useState } from "react";
import type { ServiceEntryDraft } from "./types";

const MAX_FILES = 5;

interface RepairEntryConfigProps {
	entry: ServiceEntryDraft;
	serviceId: string;
	onUpdateEntry: (
		serviceId: string,
		entryId: string,
		update: Partial<ServiceEntryDraft>,
	) => void;
}

export function RepairEntryConfig({
	entry,
	serviceId,
	onUpdateEntry,
}: RepairEntryConfigProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);

	const uploads = entry.attachmentUploads ?? [];

	const handleFiles = async (files: FileList | null) => {
		if (!files || files.length === 0) return;
		setUploadError(null);

		const remaining = MAX_FILES - uploads.length;
		if (remaining <= 0) {
			setUploadError(`Tối đa ${MAX_FILES} tệp đính kèm.`);
			return;
		}

		const formData = new FormData();
		for (const file of Array.from(files).slice(0, remaining)) {
			formData.append("files", file);
		}

		setUploading(true);
		try {
			const res = await fetch("/api/service-bookings/attachments", {
				method: "POST",
				body: formData,
			});
			const data = await res.json();
			if (!res.ok) {
				setUploadError(data.error ?? "Tải ảnh lên thất bại.");
				return;
			}
			onUpdateEntry(serviceId, entry.entryId, {
				attachmentUploads: [...uploads, ...data.uploads],
			});
		} catch {
			setUploadError("Tải ảnh lên thất bại. Vui lòng thử lại.");
		} finally {
			setUploading(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	const removeUpload = (path: string) => {
		onUpdateEntry(serviceId, entry.entryId, {
			attachmentUploads: uploads.filter((u) => u.path !== path),
		});
	};

	return (
		<div className="space-y-3">
			<div className="space-y-1.5">
				<p className="text-[11px] font-bold text-on-surface-variant">
					Mô tả lỗi bàn phím <span className="text-error">*</span>
				</p>
				<textarea
					value={entry.repairIssue ?? ""}
					onChange={(e) =>
						onUpdateEntry(serviceId, entry.entryId, {
							repairIssue: e.target.value,
						})
					}
					placeholder="Ví dụ: Bàn phím không lên nguồn sau khi cắm cable, đèn không sáng..."
					rows={3}
					className="w-full resize-none rounded-xl border border-outline-variant/20 bg-surface-container px-3 py-2.5 text-xs text-on-surface outline-none placeholder:text-on-surface-variant focus:ring-2 focus:ring-primary/30"
				/>
			</div>

			<div className="space-y-1.5">
				<p className="text-[11px] font-bold text-on-surface-variant">
					Ảnh/video mô tả{" "}
					<span className="font-medium opacity-75">(tối đa 5 tệp)</span>
				</p>

				<input
					ref={fileInputRef}
					type="file"
					accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime"
					multiple
					className="hidden"
					onChange={(e) => handleFiles(e.target.files)}
				/>

				<div className="flex flex-wrap gap-2">
					{uploads.map((upload) => (
						<div
							key={upload.path}
							className="group relative h-16 w-16 overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container"
						>
							<Image
								src={upload.url}
								alt="Ảnh mô tả lỗi"
								fill
								unoptimized
								className="object-cover"
								sizes="64px"
							/>
							<button
								type="button"
								onClick={() => removeUpload(upload.path)}
								className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
								aria-label="Xoá tệp"
							>
								<X size={12} />
							</button>
						</div>
					))}

					{uploads.length < MAX_FILES && (
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							disabled={uploading}
							className={clsx(
								"flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-outline-variant/40 bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-container-high",
								uploading && "opacity-50",
							)}
						>
							{uploading ? (
								<Loader2 size={18} className="animate-spin" />
							) : (
								<ImagePlus size={18} />
							)}
						</button>
					)}
				</div>

				{uploadError ? (
					<p className="text-[11px] font-semibold text-error">{uploadError}</p>
				) : null}
			</div>
		</div>
	);
}
