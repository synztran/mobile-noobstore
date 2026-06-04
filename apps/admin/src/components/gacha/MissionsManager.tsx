"use client";

import { ChevronDown, ChevronUp, ListChecks, Pencil, Plus, Save, Trash2, Users, X } from "lucide-react";
import React, { useEffect, useState } from "react";

interface Mission {
	id: string;
	event_id: string;
	name: string;
	mission_type: string;
	requirement: Record<string, unknown>;
	token_reward: number;
	created_at: string;
}

interface UserProgress {
	id: number;
	user_id: string;
	mission_id: number;
	progress: Record<string, unknown>;
	completed_at: string | null;
	user: { email: string; full_name: string | null } | null;
}

interface Props {
	eventId: string;
}

const MISSION_TYPES = [
	{ value: "daily_login", label: "Daily Login" },
	{ value: "purchase", label: "Purchase" },
	{ value: "share", label: "Share" },
	{ value: "invite", label: "Invite Friend" },
	{ value: "review", label: "Write Review" },
	{ value: "custom", label: "Custom" },
];

export function MissionsManager({ eventId }: Props) {
	const [missions, setMissions] = useState<Mission[]>([]);
	const [loading, setLoading] = useState(true);
	const [showForm, setShowForm] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState({
		name: "",
		mission_type: "daily_login",
		token_reward: 1,
		requirement: "{}",
	});
	const [expandedMission, setExpandedMission] = useState<string | null>(null);
	const [progressData, setProgressData] = useState<Record<string, UserProgress[]>>({});
	const [loadingProgress, setLoadingProgress] = useState<string | null>(null);

	async function fetchProgress(missionId: string) {
		if (progressData[missionId]) return; // already fetched
		setLoadingProgress(missionId);
		const res = await fetch(`/api/gacha/events/${eventId}/missions/${missionId}/progress`);
		const data = await res.json();
		setProgressData((prev) => ({ ...prev, [missionId]: Array.isArray(data) ? data : [] }));
		setLoadingProgress(null);
	}

	function toggleProgress(missionId: string) {
		if (expandedMission === missionId) {
			setExpandedMission(null);
		} else {
			setExpandedMission(missionId);
			fetchProgress(missionId);
		}
	}

	async function fetchMissions() {
		setLoading(true);
		const res = await fetch(`/api/gacha/events/${eventId}/missions`);
		const data = await res.json();
		setMissions(Array.isArray(data) ? data : []);
		setLoading(false);
	}

	useEffect(() => {
		fetchMissions();
	}, [eventId]);

	function resetForm() {
		setForm({ name: "", mission_type: "daily_login", token_reward: 1, requirement: "{}" });
		setEditingId(null);
		setShowForm(false);
	}

	function startEdit(mission: Mission) {
		setForm({
			name: mission.name,
			mission_type: mission.mission_type,
			token_reward: mission.token_reward,
			requirement: JSON.stringify(mission.requirement, null, 2),
		});
		setEditingId(mission.id);
		setShowForm(true);
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		let requirement: Record<string, unknown>;
		try {
			requirement = JSON.parse(form.requirement);
		} catch {
			alert("Invalid JSON in requirement field");
			return;
		}

		const payload = {
			name: form.name,
			mission_type: form.mission_type,
			token_reward: form.token_reward,
			requirement,
		};

		if (editingId) {
			await fetch(`/api/gacha/events/${eventId}/missions/${editingId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
		} else {
			await fetch(`/api/gacha/events/${eventId}/missions`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
		}
		resetForm();
		fetchMissions();
	}

	async function handleDelete(missionId: string) {
		if (!confirm("Delete this mission?")) return;
		await fetch(`/api/gacha/events/${eventId}/missions/${missionId}`, {
			method: "DELETE",
		});
		fetchMissions();
	}

	return (
		<div className="space-y-4">
			{/* Add button */}
			{!showForm && (
				<button
					onClick={() => setShowForm(true)}
					className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
					<Plus className="w-4 h-4" />
					Add Mission
				</button>
			)}

			{/* Form */}
			{showForm && (
				<form
					onSubmit={handleSubmit}
					className="card-bg rounded-lg card-shadow p-5 space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="font-bold text-heading">
							{editingId ? "Edit Mission" : "New Mission"}
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
								placeholder="Login daily"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-body mb-1">
								Type
							</label>
							<select
								value={form.mission_type}
								onChange={(e) => setForm({ ...form, mission_type: e.target.value })}
								className="w-full px-3 py-2 border input-base rounded-lg text-sm">
								{MISSION_TYPES.map((t) => (
									<option key={t.value} value={t.value}>
										{t.label}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-body mb-1">
								Token Reward
							</label>
							<input
								type="number"
								min={1}
								required
								value={form.token_reward}
								onChange={(e) => setForm({ ...form, token_reward: Number(e.target.value) })}
								className="w-full px-3 py-2 border input-base rounded-lg text-sm"
							/>
						</div>
					</div>
					<div>
						<label className="block text-sm font-medium text-body mb-1">
							Requirement (JSON)
						</label>
						<textarea
							value={form.requirement}
							onChange={(e) => setForm({ ...form, requirement: e.target.value })}
							rows={3}
							className="w-full px-3 py-2 border input-base rounded-lg text-sm font-mono"
							placeholder='{"min_amount": 100000}'
						/>
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

			{/* Missions table */}
			{loading ? (
				<div className="card-bg rounded-lg card-shadow p-6 animate-pulse">
					<div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
				</div>
			) : missions.length === 0 ? (
				<div className="card-bg rounded-lg card-shadow p-8 text-center">
					<ListChecks className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
					<p className="text-muted text-sm">No missions configured</p>
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
									Token Reward
								</th>
								<th className="px-6 py-3 text-left text-sm font-semibold text-heading">
									Requirement
								</th>
								<th className="px-6 py-3 text-center text-sm font-semibold text-heading">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="table-divide">
							{missions.map((mission) => (
								<React.Fragment key={mission.id}>
									<tr className="table-row-hover">
										<td className="px-6 py-4 text-sm font-medium text-heading">
											{mission.name}
										</td>
										<td className="px-6 py-4 text-sm text-body">
											<span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
												{mission.mission_type}
											</span>
										</td>
										<td className="px-6 py-4 text-sm text-center font-bold text-purple-600">
											+{mission.token_reward}
										</td>
										<td className="px-6 py-4 text-xs font-mono text-muted max-w-[200px] truncate">
											{JSON.stringify(mission.requirement)}
										</td>
										<td className="px-6 py-4">
											<div className="flex items-center justify-center gap-2">
												<button
													onClick={() => toggleProgress(mission.id)}
													className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/40 flex items-center justify-center transition-colors"
													title="View progress">
													{expandedMission === mission.id ? (
														<ChevronUp className="w-4 h-4" />
													) : (
														<Users className="w-4 h-4" />
													)}
												</button>
												<button
													onClick={() => startEdit(mission)}
													className="w-8 h-8 rounded-full btn-icon-edit flex items-center justify-center transition-colors"
													title="Edit">
													<Pencil className="w-4 h-4" />
												</button>
												<button
													onClick={() => handleDelete(mission.id)}
													className="w-8 h-8 rounded-full btn-icon-delete flex items-center justify-center transition-colors"
													title="Delete">
													<Trash2 className="w-4 h-4" />
												</button>
											</div>
										</td>
									</tr>
									{expandedMission === mission.id && (
										<tr key={`${mission.id}-progress`}>
											<td colSpan={5} className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50">
												<MissionProgressPanel
													missionId={mission.id}
													progress={progressData[mission.id]}
													loading={loadingProgress === mission.id}
												/>
											</td>
										</tr>
									)}
								</React.Fragment>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

// ─── Sub-component: User progress panel ──────────────────────────────────────
function MissionProgressPanel({
	missionId,
	progress,
	loading,
}: {
	missionId: string;
	progress: UserProgress[] | undefined;
	loading: boolean;
}) {
	if (loading) {
		return (
			<div className="animate-pulse space-y-2">
				<div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
				<div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
			</div>
		);
	}

	if (!progress || progress.length === 0) {
		return (
			<div className="text-sm text-muted flex items-center gap-2">
				<Users className="w-4 h-4" />
				No users have started this mission yet.
			</div>
		);
	}

	const completed = progress.filter((p) => p.completed_at !== null).length;

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-4 text-xs">
				<span className="font-medium text-heading">
					{progress.length} user{progress.length !== 1 ? "s" : ""}
				</span>
				<span className="text-green-600 font-semibold">
					{completed} completed
				</span>
				<span className="text-muted">
					{progress.length - completed} in progress
				</span>
			</div>
			<div className="rounded-lg border table-border overflow-hidden">
				<table className="w-full text-sm">
					<thead className="thead-bg">
						<tr>
							<th className="px-4 py-2 text-left font-medium text-heading">User</th>
							<th className="px-4 py-2 text-left font-medium text-heading">Progress</th>
							<th className="px-4 py-2 text-center font-medium text-heading">Status</th>
							<th className="px-4 py-2 text-left font-medium text-heading">Completed At</th>
						</tr>
					</thead>
					<tbody className="table-divide">
						{progress.map((p) => (
							<tr key={p.id} className="table-row-hover">
								<td className="px-4 py-2">
									<div>
										<p className="font-medium text-heading">{p.user?.email ?? p.user_id.slice(0, 8)}</p>
										{p.user?.full_name && (
											<p className="text-xs text-muted">{p.user.full_name}</p>
										)}
									</div>
								</td>
								<td className="px-4 py-2 text-xs font-mono text-muted max-w-[200px] truncate">
									{JSON.stringify(p.progress)}
								</td>
								<td className="px-4 py-2 text-center">
									{p.completed_at ? (
										<span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
											Completed
										</span>
									) : (
										<span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
											In Progress
										</span>
									)}
								</td>
								<td className="px-4 py-2 text-xs text-muted">
									{p.completed_at ? new Date(p.completed_at).toLocaleString("vi-VN") : "—"}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
