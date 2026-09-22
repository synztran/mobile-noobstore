"use client";

import { memo } from "react";

interface StockIndicatorProps {
  stockQuantity: number;
}

export const StockIndicator = memo(function StockIndicator({
  stockQuantity,
}: StockIndicatorProps) {
  // Only show when stock is between 1-10 (not 0, not > 10)
  if (stockQuantity <= 0 || stockQuantity > 10) {
    return null;
  }

  return (
    <div className="text-center text-[8px] font-black uppercase tracking-wide text-slate-500 lg:text-[10px]">
      Còn lại {stockQuantity} sản phẩm
    </div>
  );
});
