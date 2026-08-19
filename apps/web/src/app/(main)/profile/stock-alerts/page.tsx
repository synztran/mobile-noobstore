"use client";

import {
  useStockAlertList,
  useStockAlertUnsubscribe,
} from "@/lib/react-query/stock-alert/api/useStockAlertQueries";
import { BellOff, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function StockAlertsPage() {
  const { data, isLoading } = useStockAlertList();
  const unsubscribe = useStockAlertUnsubscribe();
  const subscriptions = data?.subscriptions ?? [];

  return (
    <div className="min-main-content px-4 pb-16 pt-4">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/profile"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container transition-colors active:scale-90"
        >
          <ChevronLeft size={18} />
        </Link>
        <p className="text-lg font-black tracking-tight">Hàng sắp về</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl bg-surface-container"
            />
          ))}
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <BellOff size={40} className="mb-3 text-outline-variant" />
          <p className="text-sm font-medium text-on-surface-variant">
            Chưa có sản phẩm nào
          </p>
          <p className="mt-1 text-xs text-on-surface-variant/60">
            Bạn sẽ nhận thông báo khi hàng về
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center justify-between rounded-2xl bg-surface-container-lowest px-4 py-3 shadow-ambient-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-on-surface">
                  {sub.product_id}
                </p>
                <p className="text-[10px] text-on-surface-variant">
                  {sub.notified_at
                    ? `Đã thông báo ${new Date(sub.notified_at).toLocaleDateString("vi-VN")}`
                    : `Đăng ký ${new Date(sub.created_at).toLocaleDateString("vi-VN")}`}
                </p>
              </div>
              <button
                onClick={() =>
                  unsubscribe.mutate({
                    productId: sub.product_id,
                    variantId: sub.variant_id ?? "",
                  })
                }
                disabled={unsubscribe.isPending}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-container text-on-surface-variant transition-colors hover:bg-error/10 hover:text-error active:scale-90"
              >
                <BellOff size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
