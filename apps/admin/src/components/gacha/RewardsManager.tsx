"use client";

import { Gift, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

interface Reward {
	id: string;
	event_id: string;
	reward_type: "product" | "point" | "puzzle" | "lucky_text";
	name: string;
	weight: number;
	max_quantity: number | null;
	claimed_count: number;
	is_golden: boolean;
	thumbnail_url: string | null;
	percent_display: number | null;
}

interface Props {
	eventId: string;
}

const REWARD_TYPES = [
	{ value: "product", label: "Product" },
	{ value: "point", label: "Point" },
	{ value: "puzzle", label: "Puzzle" },
	{ value: "lucky_text", label: "Lucky Text" },
];

export function RewardsManager({ eventId }: Props) {
	const [rewards, setRewards] = useState<Reward[]>([]);
	const [loading, setLoading] = useState(true);
	const [showForm, setShowForm] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState({
		name: "",
		reward_type: "lucky_text" as Reward["reward_type"],
		weight: 100,
		max_quantity: "",
		is_golden: false,
		thumbnail_url: "",
		percent_display: "",
	});

	async function fetchRewards() {
		setLoading(true);
		const res = await fetch(`/api/gacha/events/${eventId}/rewards`);
		const data = await res.json();
		setRewards(Array.isArray(data) ? data : []);
		setLoading(false);
	}

	useEffect(() => {
		fetchRewards();
	}, [eventId]);

	function resetForm() {
		setForm({
			name: "",
			reward_type: "lucky_text",
			weight: 100,
			max_quantity: "",
			is_golden: false,
			thumbnail_url: "",
			percent_display: "",
		});
		setEditingId(null);
		setShowForm(false);
	}

	function startEdit(reward: Reward) {
		setForm({
			name: reward.name,
			reward_type: reward.reward_type,
			weight: reward.weight,
			max_quantity: reward.max_quantity?.toString() ?? "",
			is_golden: reward.is_golden,
			thumbnail_url: reward.thumbnail_url ?? "",
			percent_display: reward.percent_display?.toString() ?? "",
		});
		setEditingId(reward.id);
		setShowForm(true);
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const payload = {
			name: form.name,
			reward_type: form.reward_type,
			weight: form.weight,
			max_quantity: form.max_quantity ? Number(form.max_quantity) : null,
			is_golden: form.is_golden,
			thumbnail_url: form.thumbnail_url || null,
			percent_display: form.percent_display ? Number(form.percent_display) : null,
		};

		if (editingId) {
			await fetch(`/api/gacha/events/${eventId}/rewards/${editingId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
		} else {
			await fetch(`/api/gacha/events/${eventId}/rewards`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
		}
		resetForm();
		fetchRewards();
	}

	async function handleDelete(rewardId: string) {
		if (!confirm("Delete this reward?")) return;
		await fetch(`/api/gacha/events/${eventId}/rewards/${rewardId}`, {
			method: "DELETE",
		});
		fetchRewards();
	}

	// Calculate total weight for percentage display
	const totalWeight = rewards.reduce((sum, r) => sum + r.weight, 0);

	return (
		<div className="space-y-4">
			{/* Add button */}
			{!showForm && (
				<button
					onClick={() => setShowForm(true)}
					className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
					<Plus className="w-4 h-4" />
					Add Reward
				</button>
			)}

			{/* Form */}
			{showForm && (
				<form
					onSubmit={handleSubmit}
					className="card-bg rounded-lg card-shadow p-5 space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="font-bold text-heading">
							{editingId ? "Edit Reward" : "New Reward"}
						</h3>
						<button
							type="button"
							onClick={resetForm}
							className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
							<X className="w-4 h-4 text-muted" />
						</button>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label className="block text-sm font-medium text-body mb-1">
								Name
							</label>
							<input
								type="text"
								required
								value={form.name}
								onChange={(e) => setForm({ ...form, name: e.target.value })}
								className="w-full px-3 py-2 border input-base rounded-lg text-sm"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-body mb-1">
								Type
							</label>
							<select
								value={form.reward_type}
								onChange={(e) =>
									setForm({ ...form, reward_type: e.target.value as Reward["reward_type"] })
								}
								className="w-full px-3 py-2 border input-base rounded-lg text-sm">
								{REWARD_TYPES.map((t) => (
									<option key={t.value} value={t.value}>
										{t.label}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-body mb-1">
								Weight (probability)
							</label>
							<input
								type="number"
								min={1}
								required
								value={form.weight}
								onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })}
								className="w-full px-3 py-2 border input-base rounded-lg text-sm"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-body mb-1">
								Max Quantity (empty = unlimited)
							</label>
							<input
								type="number"
								min={0}
								value={form.max_quantity}
								onChange={(e) => setForm({ ...form, max_quantity: e.target.value })}
								className="w-full px-3 py-2 border input-base rounded-lg text-sm"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-body mb-1">
								Display % (override)
							</label>
							<input
								type="number"
								min={0}
								max={100}
								step={0.01}
								value={form.percent_display}
								onChange={(e) => setForm({ ...form, percent_display: e.target.value })}
								className="w-full px-3 py-2 border input-base rounded-lg text-sm"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-body mb-1">
								Thumbnail URL
							</label>
							<input
								type="text"
								value={form.thumbnail_url}
								onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
								className="w-full px-3 py-2 border input-base rounded-lg text-sm"
							/>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<label className="inline-flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={form.is_golden}
								onChange={(e) => setForm({ ...form, is_golden: e.target.checked })}
								className="rounded"
							/>
							<span className="font-medium text-body">Golden reward (rare)</span>
						</label>
					</div>
					<div className="flex justify-end gap-3">
						<button
							type="button"
							onClick={resetForm}
							className="px-4 py-2 text-sm font-medium text-body bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors">
							Cancel
						</button>
						<button
							type="submit"
							className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">
							<Save className="w-4 h-4" />
							{editingId ? "Update" : "Create"}
						</button>
					</div>
				</form>
			)}

			{/* Rewards table */}
			{loading ? (
				<div className="card-bg rounded-lg card-shadow p-6 animate-pulse">
					<div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
				</div>
			) : rewards.length === 0 ? (
				<div className="card-bg rounded-lg card-shadow p-8 text-center">
					<Gift className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
					<p className="text-muted text-sm">No rewards configured</p>
				</div>
			) : (
				<div className="card-bg rounded-lg card-shadow overflow-hidden">
					<table className="w-full">
						<thead className="thead-bg border-b table-border">
							<tr>
								<th className="px-6 py-3 text-left text-sm font-semibold text-heading">
									Name
								</th>
								<th className="px-6 py-3 text-left text-sm font-semibold text-heading">
									Type
								</th>
								<th className="px-6 py-3 text-center text-sm font-semibold text-heading">
									Weight
								</th>
								<th className="px-6 py-3 text-center text-sm font-semibold text-heading">
									Actual %
								</th>
								<th className="px-6 py-3 text-center text-sm font-semibold text-heading">
									Display %
								</th>
								<th className="px-6 py-3 text-center text-sm font-semibold text-heading">
									Claimed
								</th>
								<th className="px-6 py-3 text-center text-sm font-semibold text-heading">
									Golden
								</th>
								<th className="px-6 py-3 text-center text-sm font-semibold text-heading">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="table-divide">
							{rewards.map((reward) => (
								<tr key={reward.id} className="table-row-hover">
									<td className="px-6 py-4 text-sm font-medium text-heading">
										{reward.name}
									</td>
									<td className="px-6 py-4 text-sm text-body">
										<span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
											{reward.reward_type}
										</span>
									</td>
									<td className="px-6 py-4 text-sm text-center text-body">
										{reward.weight}
									</td>
									<td className="px-6 py-4 text-sm text-center font-mono text-heading">
										{totalWeight > 0
											? ((reward.weight / totalWeight) * 100).toFixed(2)
											: "0"}
										%
									</td>
									<td className="px-6 py-4 text-sm text-center text-body">
										{reward.percent_display != null
											? `${reward.percent_display}%`
											: "—"}
									</td>
									<td className="px-6 py-4 text-sm text-center text-body">
										{reward.claimed_count}
										{reward.max_quantity != null && ` / ${reward.max_quantity}`}
									</td>
									<td className="px-6 py-4 text-center">
										{reward.is_golden ? (
											<span className="text-yellow-500 text-lg">★</span>
										) : (
											<span className="text-slate-300 dark:text-slate-600">—</span>
										)}
									</td>
									<td className="px-6 py-4">
										<div className="flex items-center justify-center gap-2">
											<button
												onClick={() => startEdit(reward)}
												className="w-8 h-8 rounded-full btn-icon-edit flex items-center justify-center transition-colors"
												title="Edit">
												<Pencil className="w-4 h-4" />
											</button>
											<button
												onClick={() => handleDelete(reward.id)}
												className="w-8 h-8 rounded-full btn-icon-delete flex items-center justify-center transition-colors"
												title="Delete">
												<Trash2 className="w-4 h-4" />
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
