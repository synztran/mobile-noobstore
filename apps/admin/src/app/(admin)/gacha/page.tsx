"use client";

import { useEffect, useState } from "react";
import { FerrisWheel, Plus } from "lucide-react";
import { GachaEventCard } from "@/components/gacha/GachaEventCard";
import { GachaEventDetail } from "@/components/gacha/GachaEventDetail";
import { CreateEventModal } from "@/components/gacha/CreateEventModal";

export interface GachaEvent {
	id: string;
	name: string;
	description: string | null;
	start_at: string;
	end_at: string;
	is_active: boolean;
	free_tokens_per_grant: number;
	free_token_interval_days: number;
	created_at: string;
}

export default function GachaPage() {
	const [events, setEvents] = useState<GachaEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedEvent, setSelectedEvent] = useState<GachaEvent | null>(null);
	const [showCreate, setShowCreate] = useState(false);

	async function fetchEvents() {
		setLoading(true);
		const res = await fetch("/api/gacha/events");
		const data = await res.json();
		setEvents(data);
		setLoading(false);
	}

	useEffect(() => {
		fetchEvents();
	}, []);

	if (selectedEvent) {
		return (
			<GachaEventDetail
				event={selectedEvent}
				onBack={() => {
					setSelectedEvent(null);
					fetchEvents();
				}}
				onUpdate={(updated) => setSelectedEvent(updated)}
			/>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<FerrisWheel className="w-7 h-7 text-purple-600" />
					<h1 className="text-2xl font-bold text-heading">
						Gacha Events
					</h1>
				</div>
				<button
					onClick={() => setShowCreate(true)}
					className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm">
					<Plus className="w-4 h-4" />
					New Event
				</button>
			</div>

			{/* Active event highlight */}
			{!loading && events.filter((e) => e.is_active).length > 0 && (
				<div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-4">
					<p className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">
						Currently Running
					</p>
					<p className="text-lg font-bold text-heading">
						{events.find((e) => e.is_active)?.name}
					</p>
				</div>
			)}

			{/* Events list */}
			{loading ? (
				<div className="space-y-4">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={i}
							className="card-bg rounded-lg card-shadow p-6 animate-pulse">
							<div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
							<div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
						</div>
					))}
				</div>
			) : events.length === 0 ? (
				<div className="card-bg rounded-lg card-shadow p-12 text-center">
					<FerrisWheel className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
					<p className="text-muted">No gacha events yet</p>
				</div>
			) : (
				<div className="space-y-4">
					{events.map((event) => (
						<GachaEventCard
							key={event.id}
							event={event}
							onClick={() => setSelectedEvent(event)}
						/>
					))}
				</div>
			)}

			{showCreate && (
				<CreateEventModal
					onClose={() => setShowCreate(false)}
					onCreated={() => {
						setShowCreate(false);
						fetchEvents();
					}}
				/>
			)}
		</div>
	);
}
