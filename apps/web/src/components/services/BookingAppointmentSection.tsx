"use client";

import { Calendar } from "lucide-react";
import { motion } from "motion/react";

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
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-2 rounded-2xl bg-surface-container p-4"
    >
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary" />
        <p className="text-xs font-black uppercase tracking-[0.08em] text-primary">
          Lịch hẹn và ghi chú
        </p>
      </div>

      <div className="border-b border-outline-variant/40" />

      <label className="form-control w-full">
        <span className="pb-1 text-xs font-black uppercase tracking-widest text-on-surface-variant">
          Thời gian lấy hàng
        </span>
        <input
          type="datetime-local"
          value={pickupAt}
          onChange={(e) => setPickupAt(e.target.value)}
          className="input input-bordered w-full rounded-2xl border-outline-variant/40 bg-surface text-sm"
        />
        <span className="pt-1 text-xs leading-relaxed text-on-surface-variant">
          Thời gian nhân viên ghé để lấy sản phẩm từ khách hàng
        </span>
      </label>

      <label className="form-control w-full">
        <span className="pb-1 text-xs font-black uppercase tracking-widest text-on-surface-variant">
          Ghi chú nhận hàng
        </span>
        <textarea
          rows={3}
          value={pickupNote}
          onChange={(e) => setPickupNote(e.target.value)}
          placeholder="VD: Nhận sau 18:00 tại cửa hàng"
          className="textarea textarea-bordered w-full resize-none rounded-2xl border-outline-variant/40 bg-surface text-sm placeholder:text-on-surface-variant/60"
        />
      </label>
    </motion.div>
  );
}
