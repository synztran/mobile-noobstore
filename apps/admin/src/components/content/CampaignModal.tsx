"use client";

import { SingleImageUploader } from "@/components/ui/ImageUploader";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface CampaignData {
	id: string;
	title: string;
	subtitle: string | null;
	image_url: string | null;
	cta_text: string | null;
	cta_link: string | null;
	is_active: boolean;
	priority: number;
}

interface CreateProps {
	mode: "create";
	open: boolean;
	onClose: () => void;
}

interface EditProps {
	mode: "edit";
	campaign: CampaignData;
}

type Props = CreateProps | EditProps;

export default function CampaignModal(props: Props) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [title, setTitle] = useState("");
	const [subtitle, setSubtitle] = useState("");
	const [imageUrl, setImageUrl] = useState("");
	const [ctaText, setCtaText] = useState("");
	const [ctaLink, setCtaLink] = useState("");
	const [isActive, setIsActive] = useState(true);
	const [priority, setPriority] = useState(0);

	const isEdit = props.mode === "edit";

	const isOpen = isEdit ? open : (props as CreateProps).open;

	useEffect(() => {
		if (!isOpen) return;
		if (isEdit) {
			const c = (props as EditProps).campaign;
			setTitle(c.title);
			setSubtitle(c.subtitle ?? "");
			setImageUrl(c.image_url ?? "");
			setCtaText(c.cta_text ?? "");
			setCtaLink(c.cta_link ?? "");
			setIsActive(c.is_active);
			setPriority(c.priority);
		} else {
			setTitle("");
			setSubtitle("");
			setImageUrl("");
			setCtaText("");
			setCtaLink("");
			setIsActive(true);
			setPriority(0);
		}
		setError(null);
	}, [isOpen]);

	function handleClose() {
		if (isEdit) {
			setOpen(false);
		} else {
			(props as CreateProps).onClose();
		}
	}

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setLoading(true);

		const payload = {
			title: title.trim(),
			subtitle: subtitle.trim() || null,
			image_url: imageUrl.trim() || null,
			cta_text: ctaText.trim() || null,
			cta_link: ctaLink.trim() || null,
			is_active: isActive,
			priority,
		};

		let res: Response;
		if (isEdit) {
			const c = (props as EditProps).campaign;
			res = await fetch(`/api/content/campaigns/${c.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
		} else {
			res = await fetch("/api/content/campaigns", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
		}

		const data = await res.json().catch(() => null);
		setLoading(false);

		if (!res.ok) {
			setError(data?.error ?? "Failed to save campaign");
			return;
		}

		if (isEdit) setOpen(false);
		else (props as CreateProps).onClose();
		queryClient.invalidateQueries({ queryKey: ["campaigns"] });
		router.refresh();
	}

	const modalContent = (
		<div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center">
			<div className="absolute inset-0 bg-black/50" />
			<div className="relative mx-4 flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-2xl">
				<div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
					<p className="text-lg font-semibold text-slate-900">
						{isEdit ? "Edit Campaign" : "Add Campaign"}
					</p>
					<button
						onClick={handleClose}
						className="rounded-lg p-1 transition-colors hover:bg-slate-100"
					>
						<X className="h-5 w-5 text-slate-500" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
					<div className="flex-1 space-y-4 overflow-y-auto p-6">
						{error && (
							<div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
								{error}
							</div>
						)}

						<div>
							<label className="mb-1 block text-sm font-medium text-slate-700">
								Title <span className="text-red-500">*</span>
							</label>
							<input
								required
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="Campaign title"
							/>
						</div>

						<div>
							<label className="mb-1 block text-sm font-medium text-slate-700">
								Subtitle
							</label>
							<input
								value={subtitle}
								onChange={(e) => setSubtitle(e.target.value)}
								className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="Optional subtitle"
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="mb-1 block text-sm font-medium text-slate-700">
									Priority
								</label>
								<input
									type="number"
									value={priority}
									onChange={(e) => setPriority(Number(e.target.value))}
									className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
									min={0}
								/>
							</div>

							<div className="flex items-end pb-2">
								<div className="flex items-center gap-3">
									<button
										type="button"
										onClick={() => setIsActive((v) => !v)}
										className={`relative h-6 w-10 rounded-full transition-colors ${isActive ? "bg-green-500" : "bg-slate-300"}`}
									>
										<span
											className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-4" : ""}`}
										/>
									</button>
									<span className="text-sm font-medium text-slate-700">
										{isActive ? "Active" : "Inactive"}
									</span>
								</div>
							</div>
						</div>

						<SingleImageUploader
							value={imageUrl}
							onChange={setImageUrl}
							label="Image"
						/>

						<div>
							<label className="mb-1 block text-sm font-medium text-slate-700">
								CTA Text
							</label>
							<input
								value={ctaText}
								onChange={(e) => setCtaText(e.target.value)}
								className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="Shop Now"
							/>
						</div>

						<div>
							<label className="mb-1 block text-sm font-medium text-slate-700">
								CTA Link
							</label>
							<input
								value={ctaLink}
								onChange={(e) => setCtaLink(e.target.value)}
								className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="/shop/category-slug"
							/>
						</div>
					</div>

					<div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 px-6 py-4">
						<button
							type="button"
							onClick={handleClose}
							className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={loading}
							className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
						>
							{loading ? "Saving…" : isEdit ? "Save Changes" : "Add Campaign"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);

	if (isEdit) {
		return (
			<>
				<button
					type="button"
					onClick={() => setOpen(true)}
					className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"
					title="Edit"
				>
					<Pencil className="w-4 h-4" />
				</button>
				{open && modalContent}
			</>
		);
	}

	return isOpen ? modalContent : null;
}
