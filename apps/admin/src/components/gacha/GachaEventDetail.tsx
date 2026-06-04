"use client";

import type { GachaEvent } from "@/app/(admin)/gacha/page";
import { ArrowLeft, Pencil, Save, X } from "lucide-react";
import { useState } from "react";
import { RewardsManager } from "./RewardsManager";
import { MissionsManager } from "./MissionsManager";
import { BlockedUsersManager } from "./BlockedUsersManager";
import { RewardHistoryManager } from "./RewardHistoryManager";

type Tab = "rewards" | "missions" | "history" | "blacklist";

interface Props {
	event: GachaEvent;
	onBack: () => void;
	onUpdate: (event: GachaEvent) => void;
}

export function GachaEventDetail({ event, onBack, onUpdate }: Props) {
	const [activeTab, setActiveTab] = useState<Tab>("rewards");
	const [editing, setEditing] = useState(false);
	const [form, setForm] = useState({
		name: event.name,
		description: event.description ?? "",
		start_at: event.start_at.slice(0, 16),
		end_at: event.end_at.slice(0, 16),
		is_active: event.is_active,
		free_tokens_per_grant: event.free_tokens_per_grant,
		free_token_interval_days: event.free_token_interval_days,
	});
	const [saving, setSaving] = useState(false);

	async function handleSave() {
		setSaving(true);
		const res = await fetch(`/api/gacha/events/${event.id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				...form,
				start_at: new Date(form.start_at).toISOString(),
				end_at: new Date(form.end_at).toISOString(),
			}),
		});
		if (res.ok) {
			const updated = await res.json();
			onUpdate(updated);
			setEditing(false);
		}
		setSaving(false);
	}

	const tabs: { key: Tab; label: string }[] = [
		{ key: "rewards", label: "Rewards" },
		{ key: "missions", label: "Missions" },
		{ key: "history", label: "History" },
		{ key: "blacklist", label: "Blacklist" },
	];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-3">
				<button
					onClick={onBack}
					className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 flex items-center justify-center transition-colors">
					<ArrowLeft className="w-5 h-5 text-body" />
				</button>
				<div className="flex-1">
					<h1 className="text-2xl font-bold text-heading">
						{event.name}
					</h1>
					<p className="text-sm text-muted">
						Event management
					</p>
				</div>
				{!editing ? (
					<button
						onClick={() => setEditing(true)}
					className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors text-sm font-medium text-body">
						<Pencil className="w-4 h-4" />
						Edit Event
					</button>
				) : (
					<div className="flex gap-2">
						<button
							onClick={() => setEditing(false)}
							className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors text-sm font-medium text-body">
							<X className="w-4 h-4" />
							Cancel
						</button>
						<button
							onClick={handleSave}
							disabled={saving}
							className="inline-flex items-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-sm font-medium text-white disabled:opacity-50">
							<Save className="w-4 h-4" />
							{saving ? "Saving..." : "Save"}
						</button>
					</div>
				)}
			</div>

			{/* Event info / edit form */}
			{editing ? (
				<div className="card-bg rounded-lg card-shadow p-6 space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-body mb-1">
								Name
							</label>
							<input
								type="text"
								value={form.name}
								onChange={(e) => setForm({ ...form, name: e.target.value })}
								className="w-full px-3 py-2 border input-base rounded-lg text-sm"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-body mb-1">
								Active
							</label>
							<select
								value={form.is_active ? "true" : "false"}
								onChange={(e) =>
									setForm({ ...form, is_active: e.target.value === "true" })
								}
								className="w-full px-3 py-2 border input-base rounded-lg text-sm">
								<option value="true">Active</option>
								<option value="false">Inactive</option>
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-body mb-1">
								Start At
							</label>
							<input
								type="datetime-local"
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
								value={form.end_at}
								onChange={(e) => setForm({ ...form, end_at: e.target.value })}
								className="w-full px-3 py-2 border input-base rounded-lg text-sm"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-body mb-1">
								Free Tokens per Grant
							</label>
							<input
								type="number"
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
								value={form.free_token_interval_days}
								onChange={(e) =>
									setForm({ ...form, free_token_interval_days: Number(e.target.value) })
								}
								className="w-full px-3 py-2 border input-base rounded-lg text-sm"
							/>
						</div>
					</div>
					<div>
						<label className="block text-sm font-medium text-body mb-1">
							Description
						</label>
						<textarea
							value={form.description}
							onChange={(e) => setForm({ ...form, description: e.target.value })}
							rows={3}
							className="w-full px-3 py-2 border input-base rounded-lg text-sm"
						/>
					</div>
				</div>
			) : (
				<div className="card-bg rounded-lg card-shadow p-6">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
						<div>
							<p className="text-muted">Status</p>
							<p className="font-semibold">
								{event.is_active ? (
									<span className="text-green-600">Active</span>
								) : (
									<span className="text-muted">Inactive</span>
								)}
							</p>
						</div>
						<div>
							<p className="text-muted">Start</p>
							<p className="font-semibold text-heading">
								{new Date(event.start_at).toLocaleDateString("vi-VN")}
							</p>
						</div>
						<div>
							<p className="text-muted">End</p>
							<p className="font-semibold text-heading">
								{new Date(event.end_at).toLocaleDateString("vi-VN")}
							</p>
						</div>
						<div>
							<p className="text-muted">Free Tokens</p>
							<p className="font-semibold text-heading">
								{event.free_tokens_per_grant} / {event.free_token_interval_days}d
							</p>
						</div>
					</div>
					{event.description && (
						<p className="text-sm text-muted mt-3">
							{event.description}
						</p>
					)}
				</div>
			)}

			{/* Tabs */}
			<div className="border-b table-border">
				<nav className="flex gap-6">
					{tabs.map((tab) => (
						<button
							key={tab.key}
							onClick={() => setActiveTab(tab.key)}
							className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
								activeTab === tab.key
									? "border-purple-600 text-purple-600"
									: "border-transparent text-muted hover:text-heading"
							}`}>
							{tab.label}
						</button>
					))}
				</nav>
			</div>

			{/* Tab content */}
			{activeTab === "rewards" && <RewardsManager eventId={event.id} />}
			{activeTab === "missions" && <MissionsManager eventId={event.id} />}
			{activeTab === "history" && <RewardHistoryManager eventId={event.id} />}
			{activeTab === "blacklist" && <BlockedUsersManager eventId={event.id} />}
		</div>
	);
}
