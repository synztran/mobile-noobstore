"use client";

import { Calendar } from "lucide-react";

interface BookingAppointmentSectionProps {
	pickupAt: string;
	setPickupAt: (val: string) => void;
	pickupNote: string;
	setPickupNote: (val: string) => void;
}

export function BookingAppointmentSection({
	pickupAt,
	setPickupAt,
	pickupNote,
	setPickupNote,
}: BookingAppointmentSectionProps) {
	return (
		<div className="space-y-4 rounded-2xl bg-surface-container p-4">
			<div className="flex items-center gap-2">
				<Calendar className="h-4 w-4 text-primary" />
				<p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
					Lịch hẹn và ghi chú
				</p>
			</div>

			<div className="border-b border-outline-variant/20" />

			<div className="space-y-1.5">
				<label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
					Thời gian lấy hàng
				</label>
				<input
					type="datetime-local"
					value={pickupAt}
					onChange={(e) => setPickupAt(e.target.value)}
					className="w-full rounded-2xl bg-surface px-4 py-3.5 text-sm text-on-surface outline-none ring-1 ring-inset ring-outline-variant/40 transition-shadow focus:ring-2 focus:ring-primary/40"
				/>
				<p className="text-[10px] leading-relaxed text-on-surface-variant">
					Thời gian nhân viên ghé để lấy sản phẩm từ khách hàng
				</p>
			</div>

			<div className="space-y-1.5">
				<label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
					Ghi chú nhận hàng
				</label>
				<textarea
					rows={3}
					value={pickupNote}
					onChange={(e) => setPickupNote(e.target.value)}
					placeholder="VD: Nhận sau 18:00 tại cửa hàng"
					className="w-full resize-none rounded-2xl bg-surface px-4 py-3.5 text-sm text-on-surface outline-none ring-1 ring-inset ring-outline-variant/40 transition-shadow placeholder:text-on-surface-variant/60 focus:ring-2 focus:ring-primary/40"
				/>
			</div>
		</div>
	);
}
