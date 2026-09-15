"use client";

import { usePreventScroll } from "@/hooks/usePreventScroll";
import { CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface ServiceBookingSuccessDrawerProps {
  open: boolean;
  orderNumber: string | null;
  onClose: () => void;
  onBookMore: () => void;
}

export function ServiceBookingSuccessDrawer({
  open,
  orderNumber,
  onClose,
  onBookMore,
}: ServiceBookingSuccessDrawerProps) {
  usePreventScroll(open);

  return (
    <AnimatePresence>
      {open ? (
        <div className="modal modal-bottom modal-open">
          <motion.div
            className="modal-box rounded-t-3xl bg-surface-container-lowest p-5"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="w-8" />
              <div className="h-1 w-12 rounded-full bg-outline-variant" />
              <button
                type="button"
                onClick={onClose}
                className="btn btn-ghost btn-sm rounded-xl text-xs font-bold"
              >
                Đóng
              </button>
            </div>

            <div className="space-y-3 pb-5 text-center">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.08 }}
              >
                <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
              </motion.div>
              <h3 className="text-lg font-black uppercase tracking-wide text-on-surface">
                Đặt lịch thành công
              </h3>
              <p className="text-sm text-on-surface-variant">Mã đơn của bạn:</p>
              <motion.p
                key={orderNumber ?? "empty"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="text-base font-black text-primary"
              >
                {orderNumber ?? "--"}
              </motion.p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={onBookMore}
                className="btn btn-primary btn-block rounded-full bg-gradient-to-r from-primary to-secondary text-[11px] font-black uppercase tracking-widest text-primary-content shadow-lg shadow-primary/20"
              >
                Đặt thêm dịch vụ
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-block rounded-full border border-outline-variant/30 bg-surface-container text-[11px] font-black uppercase tracking-widest text-on-surface"
              >
                Đóng
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
