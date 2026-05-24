"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

interface Props {
	open: boolean;
	onClose: () => void;
}

function toSlug(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-");
}

export default function CreateCategoryModal({ open, onClose }: Props) {
	const router = useRouter();
	const formRef = useRef<HTMLFormElement>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [slug, setSlug] = useState("");

	if (!open) return null;

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setLoading(true);

		const fd = new FormData(e.currentTarget);
		const name = fd.get("name") as string;
		const thumbnail = (fd.get("thumbnail") as string) || null;

		const res = await fetch("/api/categories", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, slug, thumbnail }),
		});

		setLoading(false);

		if (!res.ok) {
			const data = await res.json();
			setError(data.error ?? "Failed to create category");
			return;
		}

		formRef.current?.reset();
		setSlug("");
		onClose();
		router.refresh();
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center !mt-0">
			<div className="absolute inset-0 bg-black/50" onClick={onClose} />
			<div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
				<div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
					<h2 className="text-lg font-semibold text-slate-900">
						Create New Category
					</h2>
					<button
						onClick={onClose}
						className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
						<X className="w-5 h-5 text-slate-500" />
					</button>
				</div>

				<form
					ref={formRef}
					onSubmit={handleSubmit}
					className="p-6 space-y-4">
					{error && (
						<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
							{error}
						</div>
					)}

					{/* Name */}
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-1">
							Name <span className="text-red-500">*</span>
						</label>
						<input
							name="name"
							required
							className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="Category name"
							onChange={(e) => setSlug(toSlug(e.target.value))}
						/>
					</div>

					{/* Slug */}
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-1">
							Slug <span className="text-red-500">*</span>
						</label>
						<input
							name="slug"
							required
							value={slug}
							onChange={(e) => setSlug(e.target.value)}
							className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="category-slug"
						/>
					</div>

					{/* Thumbnail URL */}
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-1">
							Thumbnail URL
						</label>
						<input
							name="thumbnail"
							type="url"
							className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="https://…"
						/>
					</div>

					{/* Actions */}
					<div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
							Cancel
						</button>
						<button
							type="submit"
							disabled={loading}
							className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors">
							{loading ? "Creating…" : "Create Category"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
