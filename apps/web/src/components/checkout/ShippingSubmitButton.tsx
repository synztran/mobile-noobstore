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
        "primary-gradient flex w-full items-center justify-center gap-2 !rounded-b-3xl py-5 text-sm font-black uppercase tracking-widest text-white transition-opacity active:opacity-90",
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
          Tiếp tục thanh toán
          <ArrowRight className="h-5 w-5" />
        </>
      )}
    </button>
  );
}
