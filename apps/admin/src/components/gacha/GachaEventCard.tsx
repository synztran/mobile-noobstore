"use client";

import type { GachaEvent } from "@/app/(admin)/gacha/page";
import { Calendar, Zap } from "lucide-react";

interface Props {
	event: GachaEvent;
	onClick: () => void;
}

export function GachaEventCard({ event, onClick }: Props) {
	const now = new Date();
	const start = new Date(event.start_at);
	const end = new Date(event.end_at);
	const isOngoing = event.is_active && now >= start && now <= end;
	const isUpcoming = now < start;
	const isExpired = now > end;

	return (
		<button
			type="button"
			onClick={onClick}
			className="w-full card-bg rounded-lg card-shadow p-5 text-left hover:shadow-md transition-shadow">
			<div className="flex items-start justify-between gap-4">
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 mb-1">
						<h3 className="text-base font-bold text-heading truncate">
							{event.name}
						</h3>
						{isOngoing && (
							<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
								<span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
								Live
							</span>
						)}
						{isUpcoming && (
							<span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
								Upcoming
							</span>
						)}
						{isExpired && !event.is_active && (
							<span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
								Ended
							</span>
						)}
					</div>
					{event.description && (
						<p className="text-sm text-muted line-clamp-1 mb-2">
							{event.description}
						</p>
					)}
					<div className="flex items-center gap-4 text-xs text-muted">
						<span className="inline-flex items-center gap-1">
							<Calendar className="w-3.5 h-3.5" />
							{start.toLocaleDateString("vi-VN")} –{" "}
							{end.toLocaleDateString("vi-VN")}
						</span>
						<span className="inline-flex items-center gap-1">
							<Zap className="w-3.5 h-3.5" />
							{event.free_tokens_per_grant} tokens / {event.free_token_interval_days}d
						</span>
					</div>
				</div>
			</div>
		</button>
	);
}
