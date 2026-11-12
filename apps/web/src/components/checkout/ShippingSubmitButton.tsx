"use client";

import { ArrowRight } from "lucide-react";
import clsx from "clsx";

interface Props {
  isCalculatingFee: boolean;
  isSubmitting: boolean;
}

export function ShippingSubmitButton({
  isCalculatingFee,
  isSubmitting,
}: Props) {
  const disabled = isCalculatingFee || isSubmitting;

  return (
    <button
      type="submit"
      disabled={disabled}
      className={clsx(
        "primary-gradient flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-ambient-md transition-all active:scale-[0.99] active:opacity-90 md:text-sm",
        disabled && "cursor-not-allowed opacity-70"
      )}
    >
      {isSubmitting ? (
        <>
          <span className="loading loading-spinner loading-sm" />
          Đang xử lý...
        </>
      ) : isCalculatingFee ? (
        <>
          <span className="loading loading-spinner loading-sm" />
          Đang tính phí...
        </>
      ) : (
        <>
          Tiếp tục kiểm tra đơn hàng
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </button>
  );
}
