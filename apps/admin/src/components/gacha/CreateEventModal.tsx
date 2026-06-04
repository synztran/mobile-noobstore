"use client";

import { X } from "lucide-react";
import { useState } from "react";

interface Props {
	onClose: () => void;
	onCreated: () => void;
}

export function CreateEventModal({ onClose, onCreated }: Props) {
	const [form, setForm] = useState({
		name: "",
		description: "",
		start_at: "",
		end_at: "",
		free_tokens_per_grant: 3,
		free_token_interval_days: 1,
	});
	const [saving, setSaving] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSaving(true);
		const res = await fetch("/api/gacha/events", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				...form,
				start_at: new Date(form.start_at).toISOString(),
				end_at: new Date(form.end_at).toISOString(),
				is_active: false,
			}),
		});
		if (res.ok) {
			onCreated();
		}
		setSaving(false);
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center !mt-0">
			<div className="absolute inset-0 bg-black/50" onClick={onClose} />
			<div className="relative card-bg rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-bold text-heading">
						Create Gacha Event
					</h2>
					<button
						onClick={onClose}
						className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
						<X className="w-5 h-5 text-muted" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-body mb-1">
							Event Name
						</label>
						<input
							type="text"
							required
							value={form.name}
							onChange={(e) => setForm({ ...form, name: e.target.value })}
							className="w-full px-3 py-2 border input-base rounded-lg text-sm"
							placeholder="Summer Lucky Draw"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-body mb-1">
							Description
						</label>
						<textarea
							value={form.description}
							onChange={(e) => setForm({ ...form, description: e.target.value })}
							rows={2}
							className="w-full px-3 py-2 border input-base rounded-lg text-sm"
						/>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-body mb-1">
								Start At
							</label>
							<input
								type="datetime-local"
								required
								value={form.start_at}
								onChange={(e) => setForm({ ...form, start_at: e.target.value })}
								className="w-full px-3 py-2 border input-base rounded-lg text-sm"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-body mb-1">
								End At
							</label>
							<input
								type="datetime-local"
								required
								value={form.end_at}
								onChange={(e) => setForm({ ...form, end_at: e.target.value })}
								className="w-full px-3 py-2 border input-base rounded-lg text-sm"
							/>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-body mb-1">
								Free Tokens per Grant
							</label>
							<input
								type="number"
								min={1}
								value={form.free_tokens_per_grant}
								onChange={(e) =>
									setForm({ ...form, free_tokens_per_grant: Number(e.target.value) })
								}
								className="w-full px-3 py-2 border input-base rounded-lg text-sm"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-body mb-1">
								Token Interval (days)
							</label>
							<input
								type="number"
								min={1}
								value={form.free_token_interval_days}
								onChange={(e) =>
									setForm({ ...form, free_token_interval_days: Number(e.target.value) })
								}
								className="w-full px-3 py-2 border input-base rounded-lg text-sm"
							/>
						</div>
					</div>
					<div className="flex justify-end gap-3 pt-2">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 text-sm font-medium text-body bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors">
							Cancel
						</button>
						<button
							type="submit"
							disabled={saving}
							className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50">
							{saving ? "Creating..." : "Create Event"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
