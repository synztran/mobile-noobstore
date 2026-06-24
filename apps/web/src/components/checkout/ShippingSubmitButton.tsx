"use client";

import Icon from "@/components/ui/Icon";
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
          Đang tính toán...
        </>
      ) : (
        <>
          Tiếp tục thanh toán
          <Icon name="arrow_forward" className="text-lg" />
        </>
      )}
    </button>
  );
}
