"use client";

import { memo } from "react";

function DiscountTeaser() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-surface-container-low p-4">
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber-400/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-orange-400/15 blur-xl" />
      <div className="relative flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black tracking-tight text-amber-700">
            Thêm mã giảm giá ở bước tiếp theo
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Mã giảm giá và các ưu đãi khác sẽ được áp dụng ở bước tiếp theo. Bạn
            có thể nhập mã giảm giá hoặc chọn ưu đãi có sẵn.
          </p>
        </div>
      </div>
    </div>
  );
}

export default memo(DiscountTeaser);
