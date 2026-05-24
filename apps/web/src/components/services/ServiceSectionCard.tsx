"use client";

import type { BookingService } from "@/app/api/services/booking-config/route";
import Icon from "@/components/ui/Icon";
import { formatVND } from "@/lib/currency";
import { Plus } from "lucide-react";
import Image from "next/image";
import { ServiceEntryCard } from "./ServiceEntryCard";
import type { ServiceEntryDraft, ServiceSectionCardProps } from "./types";

// Re-exports for external consumers (useServiceBookingFlow, validators, handlers)
export {
	CLEANING_KEYBOARD_LAYOUTS,
	CLEANING_KEYBOARD_PRICES,
	CLEANING_SWITCH_BUNDLES,
	CLEANING_SWITCH_STATUSES,
	computeCleaningPrice,
	computeKeycapStemPrice,
	computeSwitchLubePrice,
	getStabilizerTotal,
} from "./bookingHelpers";
export type { ServiceEntryDraft } from "./types";

export function ServiceSectionCard({
	section,
	selections,
	onAddEntry,
	onRemoveEntry,
	onSelectOptionValue,
	onChangeLineNote,
	onUpdateEntry,
}: ServiceSectionCardProps) {
	return (
		<section className="rounded-2xl bg-surface-container">
			{section.heroImageUrl ? (
				<div className="relative w-full h-40">
					<Image
						src={section.heroImageUrl}
						alt={`${section.title} hero`}
						fill
						className="object-cover rounded-t-2xl"
					/>
				</div>
			) : null}
			<div className="p-4 space-y-2">
				<div className="flex items-center justify-between">
					<h3 className="text-sm font-black uppercase tracking-wide text-on-surface">
						{section.title}
					</h3>
					<span className="text-[10px] text-on-surface-variant uppercase tracking-wider">
						<strong className="text-primary">
							{section.services.length}
						</strong>{" "}
						dịch vụ khả dụng
					</span>
				</div>

				<div className="space-y-4">
					{section.services.map((service) => (
						<ServiceCard
							key={service.id}
							service={service}
							entries={selections[service.id] ?? []}
							section={section}
							onAddEntry={onAddEntry}
							onRemoveEntry={onRemoveEntry}
							onUpdateEntry={onUpdateEntry}
							onSelectOptionValue={onSelectOptionValue}
							onChangeLineNote={onChangeLineNote}
						/>
					))}
				</div>
			</div>
		</section>
	);
}

// ─── ServiceCard (per-service row) ────────────────────────────────────────────

function ServiceCard({
	service,
	entries,
	section,
	onAddEntry,
	onRemoveEntry,
	onUpdateEntry,
	onSelectOptionValue,
	onChangeLineNote,
}: {
	service: BookingService;
	entries: ServiceEntryDraft[];
	section: ServiceSectionCardProps["section"];
	onAddEntry: ServiceSectionCardProps["onAddEntry"];
	onRemoveEntry: ServiceSectionCardProps["onRemoveEntry"];
	onUpdateEntry: ServiceSectionCardProps["onUpdateEntry"];
	onSelectOptionValue: ServiceSectionCardProps["onSelectOptionValue"];
	onChangeLineNote: ServiceSectionCardProps["onChangeLineNote"];
}) {
	return (
		<div className="rounded-2xl border border-base-200 bg-base-100 p-3 space-y-2">
			<div className="flex flex-col">
				<p className="text-sm font-black text-on-surface leading-tight">
					{service.name}
				</p>
				<p className="text-xs text-on-surface-variant mt-1">
					{service.base_price > 0
						? `${formatVND(service.base_price)} · `
						: ""}
					{service.handling_days} ngày xử lý
				</p>
				{service.description ? (
					<p className="text-xs text-on-surface-variant leading-relaxed mt-0.5">
						{service.description}
					</p>
				) : null}
			</div>

			{entries.length === 0 ? (
				<div className="flex items-center gap-2 rounded-xl border border-dashed border-base-300 bg-base-200/40 px-3 py-3">
					<div className="w-6 h-6 rounded-full bg-base-200 flex items-center justify-center shrink-0">
						<Plus size={12} className="text-on-surface-variant" />
					</div>
					<p className="text-xs text-on-surface-variant">
						Nhấn{" "}
						<strong className="text-on-surface">
							Thêm dịch vụ
						</strong>{" "}
						để bắt đầu đặt lịch dịch vụ này.
					</p>
				</div>
			) : (
				<div className="space-y-3">
					<div className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-black text-primary">
						<span className="w-4 h-4 rounded-full bg-primary text-primary-content text-[10px] flex items-center justify-center font-black">
							{entries.length}
						</span>
						mục đã chọn
					</div>
					{entries.map((entry, idx) => (
						<ServiceEntryCard
							key={entry.entryId}
							section={section}
							service={service}
							entry={entry}
							index={idx}
							onRemoveEntry={onRemoveEntry}
							onUpdateEntry={onUpdateEntry}
							onSelectOptionValue={onSelectOptionValue}
							onChangeLineNote={onChangeLineNote}
						/>
					))}
				</div>
			)}

			<button
				type="button"
				onClick={() => onAddEntry(service)}
				disabled={
					service.max_entries !== null &&
					entries.length >= service.max_entries
				}
				className="btn btn-sm rounded-full text-xs w-full disabled:opacity-40">
				<Icon name="add" className="text-xs" />
				{service.max_entries !== null &&
				entries.length >= service.max_entries
					? "Đã đạt giới hạn"
					: "Thêm mới dịch vụ"}
			</button>
		</div>
	);
}
