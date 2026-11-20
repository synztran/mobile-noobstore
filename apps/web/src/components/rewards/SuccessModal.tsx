"use client";

import { CheckCircle } from "lucide-react";
import type { RedeemResponse } from "@/types/reward";
import { formatPoints } from "./utils";
import { useEffect } from "react";

interface Props {
  result: RedeemResponse | null;
  open: boolean;
  onClose: () => void;
}

export function SuccessModal({ result, open, onClose }: Props) {
  useEffect(() => {
    if (open) {
      document.body.classList.add("hide-bottom-nav");
      return () => {
        document.body.classList.remove("hide-bottom-nav");
      };
    }
  }, [open]);

  if (!result) return null;

  return (
    <dialog
      onCancel={(e) => e.preventDefault()}
      className={`modal modal-bottom sm:modal-middle my-0 !my-0 z-[9999] ${open ? "modal-open" : ""}`}
    >
      <div className="modal-box my-0 rounded-2xl bg-surface px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="flex flex-col items-center py-4 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle size={40} className="text-emerald-600" />
          </div>
          <p className="mb-1 text-lg font-black text-on-surface">
            Đổi thưởng thành công!
          </p>

          {result.rewardType === "voucher" && result.voucherCode && (
            <>
              <p className="mb-6 text-sm text-on-surface-variant">
                Bạn đã đổi{" "}
                <span className="font-bold text-on-surface">
                  {result.voucherName}
                </span>
              </p>
              <div className="mb-6 w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 p-5 shadow-ambient-sm">
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-white/70">
                  Mã ưu đãi
                </p>
                <p className="mb-2 text-2xl font-black tracking-wider text-white">
                  {result.voucherCode}
                </p>
                <p className="text-xs font-semibold text-white/80">
                  {result.benefit}
                </p>
              </div>
            </>
          )}

          {result.rewardType === "point" && (
            <div className="mb-6 w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 p-5 text-center shadow-ambient-sm">
              <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-white/70">
                Điểm đã nhận
              </p>
              <p className="text-3xl font-black text-white">
                +{result.pointAmount}
              </p>
            </div>
          )}

          {result.rewardType === "product" && (
            <p className="mb-6 text-sm text-on-surface-variant">
              {result.benefit}. Chúng tôi sẽ liên hệ bạn để xử lý.
            </p>
          )}

          <p className="mb-6 text-xs text-on-surface-variant">
            Số điểm còn lại:{" "}
            <span className="font-bold text-on-surface">
              {formatPoints(result.newBalance)}
            </span>
          </p>

          <button
            onClick={onClose}
            className="primary-gradient w-full rounded-xl py-4 text-xs font-black uppercase tracking-widest text-white transition-transform active:scale-95"
          >
            Hoàn tất
          </button>
        </div>
      </div>
      <div className="modal-backdrop" />
    </dialog>
  );
}
