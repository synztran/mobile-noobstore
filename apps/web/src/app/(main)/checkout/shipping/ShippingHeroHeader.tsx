"use client";

import { Truck } from "lucide-react";
import { memo } from "react";

function ShippingHeroHeader() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-surface-container to-surface-container-low p-4">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-secondary/10 blur-xl" />
      <div className="relative flex items-center gap-4">
        <div className="primary-gradient flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl shadow-ambient-sm">
          <Truck className="text-2xl text-white" />
        </div>
        <div>
          <p className="mb-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            Bước 01 / 03
          </p>
          <h2 className="text-2xl font-black tracking-tight text-on-surface">
            Thông tin giao hàng
          </h2>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Nhập địa chỉ nhận hàng của bạn
          </p>
        </div>
      </div>
    </div>
  );
}

export default memo(ShippingHeroHeader);
