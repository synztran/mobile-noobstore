"use client";

import Icon from "@/components/ui/Icon";
import clsx from "clsx";

interface AddToCartButtonProps {
  isOutOfStock: boolean;
  missingVariantSelection: boolean;
  missingConfiguration: boolean;
  isLoading: boolean;
  isPreOrder?: boolean;
  onClick: () => void | Promise<void>;
  className?: string;
}

export function AddToCartButton({
  isOutOfStock,
  missingVariantSelection,
  missingConfiguration,
  isLoading,
  isPreOrder = false,
  onClick,
  className,
}: AddToCartButtonProps) {
  const isDisabled =
    isOutOfStock ||
    missingVariantSelection ||
    missingConfiguration ||
    isLoading;

  const getButtonLabel = () => {
    if (isLoading) return "Đang xử lý...";
    if (missingVariantSelection || missingConfiguration) return "Vui lòng chọn";
    if (isOutOfStock) return "Hết hàng";
    if (isPreOrder) return "Đặt trước";
    return "Thêm vào giỏ hàng";
  };

  const getIcon = () => {
    if (isLoading) return "hourglass_top";
    if (isPreOrder) return "schedule";
    return "shopping_bag";
  };

  return (
    <button
      type="button"
      data-testid="add-to-cart"
      onClick={onClick}
      disabled={isDisabled}
      className={clsx(
        "flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-container text-xs font-black uppercase tracking-widest transition-transform active:scale-[0.98]",
        isDisabled ? "cursor-not-allowed text-white opacity-50" : "text-white",
        className
      )}
    >
      {isLoading ? (
        <div className="animate-spin">
          <Icon name="hourglass_top" className="text-xl" />
        </div>
      ) : (
        <Icon name={getIcon()} className="text-xl" />
      )}
      {getButtonLabel()}
    </button>
  );
}
