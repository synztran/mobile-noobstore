"use client";

import Icon from "@/components/ui/Icon";
import { withAuthRedirect } from "@/components/auth/withAuthRedirect";
import {
  usePointsBalance,
  usePointsHistory,
} from "@/lib/react-query/points/api/usePointsQueries";
import Link from "next/link";
import { useEffect, useRef } from "react";

function HistorySkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-3xl bg-surface-container p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded-full bg-surface-container-high" />
              <div className="h-3 w-48 rounded-full bg-surface-container-high" />
            </div>
            <div className="h-5 w-20 rounded-full bg-surface-container-high" />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDelta(delta: number) {
  const value = Math.abs(delta).toLocaleString("vi-VN");
  return `${delta > 0 ? "+" : "-"}${value}`;
}

function formatPoints(value: number) {
  return `${value.toLocaleString("vi-VN")} điểm`;
}

function getSourceLabel(sourceType: string) {
  const labels: Record<string, string> = {
    order_delivered: "Đơn hàng hoàn tất",
    service_completed: "Dịch vụ hoàn tất",
    gacha_reward: "Thưởng gacha",
    gacha_event: "Sự kiện gacha",
    social_event: "Sự kiện cộng đồng",
    gift_card: "Mã quà tặng",
    admin_adjustment: "Điều chỉnh thủ công",
    voucher_exchange: "Đổi voucher",
    product_exchange: "Đổi sản phẩm",
  };
  return labels[sourceType] ?? sourceType.replaceAll("_", " ");
}

function PointsPage() {
  const { data: balance } = usePointsBalance();
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = usePointsHistory();

  const transactions = data?.pages.flatMap((p) => p.transactions) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const loading = isLoading;

  // Infinite scroll sentinel
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void fetchNextPage();
      },
      { rootMargin: "180px 0px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (loading) {
    return (
      <div className="space-y-4 px-4 pb-24 pt-2">
        <div className="mb-2 flex items-center gap-3">
          <Link
            href="/profile"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container transition-transform active:scale-90"
          >
            <Icon name="arrow_back" className="text-lg text-on-surface" />
          </Link>
          <div>
            <h1 className="text-xl font-black tracking-tight text-on-surface">
              Lịch sử điểm NSP
            </h1>
            <div className="mt-1 h-3 w-24 rounded-full bg-surface-container-high" />
          </div>
        </div>
        <div className="rounded-3xl bg-gradient-to-r from-amber-400 to-orange-400 p-5 shadow-ambient-sm">
          <div className="mb-3 h-3 w-28 animate-pulse rounded-full bg-white/30" />
          <div className="h-8 w-32 animate-pulse rounded-full bg-white/30" />
        </div>
        <HistorySkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 pb-24 pt-2">
      <div className="mb-2 flex items-center gap-3">
        <Link
          href="/profile"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container transition-transform active:scale-90"
        >
          <Icon name="arrow_back" className="text-lg text-on-surface" />
        </Link>
        <div>
          <h1 className="text-xl font-black tracking-tight text-on-surface">
            Lịch sử điểm
          </h1>
          <p className="text-xs text-on-surface-variant">{total} giao dịch</p>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 p-4 shadow-ambient-sm">
        <p className="text-sm font-semibold text-white/80">Số điểm hiện tại</p>
        <p className="mt-1 text-3xl font-black text-white">
          {balance === undefined ? "--" : formatPoints(balance)}
        </p>
        <p className="mt-2 text-xs text-gray-600">
          Điểm được cộng hoặc trừ khi bạn đặt hàng, đổi quà, hoặc nhận thưởng.
        </p>
      </div>

      {error ? (
        <div className="rounded-3xl bg-error/10 px-4 py-3 text-sm font-semibold text-error">
          {error.message}
        </div>
      ) : null}

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container">
            <Icon name="history" className="text-2xl text-outline-variant" />
          </div>
          <p className="text-center text-sm font-semibold text-on-surface-variant">
            Bạn chưa có giao dịch điểm nào
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => {
            const isPositive = tx.delta > 0;
            return (
              <div
                key={tx.id}
                className="rounded-3xl bg-surface-container-lowest p-4 shadow-ambient-sm"
              >
                <div className="flex items-start justify-between gap-8">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-on-surface">
                        {getSourceLabel(tx.source_type)}
                      </span>
                    </div>
                    <p className="line-clamp-1 text-sm text-on-surface-variant">
                      {tx.note || tx.source_ref || "Không có ghi chú"}
                    </p>
                    <p className="text-xs text-on-surface-variant/80">
                      {new Date(tx.created_at).toLocaleString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-xl font-black ${isPositive ? "text-emerald-600" : "text-rose-600"}`}
                    >
                      {formatDelta(tx.delta)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {isFetchingNextPage ? <HistorySkeleton /> : null}

          <div ref={loadMoreRef} aria-hidden="true" className="h-2" />

          {hasNextPage && !isFetchingNextPage ? (
            <div className="flex items-center justify-center py-2 text-xs text-on-surface-variant">
              <Icon name="more_horiz" className="mr-2 text-sm" />
              Đang tải thêm lịch sử...
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default withAuthRedirect(PointsPage);
