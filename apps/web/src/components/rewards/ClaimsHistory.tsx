"use client";

import type { RewardClaim } from "@/types/reward";
import { toast } from "@/lib/toast";
import { ArrowDown, Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatDate, formatPoints } from "./utils";

interface Props {
  claims: RewardClaim[];
  isLoading: boolean;
  variant?: "mobile" | "desktop";
}

export function ClaimsHistory({
  claims,
  isLoading,
  variant = "mobile",
}: Props) {
  const [copyError, setCopyError] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDesktop = variant === "desktop";
  const visibleClaims = isDesktop && !showAll ? claims.slice(0, 3) : claims;

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    []
  );

  const copyCode = async (code: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(code);
        } catch {
          // Clipboard permissions can reject writes on non-secure or embedded origins.
          if (!copyWithExecCommand(code)) throw new Error("Clipboard unavailable");
        }
      } else if (!copyWithExecCommand(code)) {
        throw new Error("Clipboard unavailable");
      }
      setCopyError(false);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      setCopiedCode(code);
      copiedTimer.current = setTimeout(() => setCopiedCode(null), 3000);
      toast.success("Đã sao chép mã voucher");
    } catch {
      setCopyError(true);
      toast.error("Không thể sao chép mã voucher");
    }
  };

  const copyWithExecCommand = (code: string) => {
        const input = document.createElement("textarea");
        input.value = code;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand("copy");
        input.remove();
        return copied;
  };

  const formatClaimDate = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const time = date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return isToday
      ? `Hôm nay · ${time}`
      : `${date.toLocaleDateString("vi-VN")} · ${time}`;
  };

  return (
    <div
      className={
        isDesktop
          ? "rounded-xl border border-surface-container-high bg-surface-container-lowest p-3.5"
          : "space-y-2"
      }
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p
          className={
            isDesktop
              ? "text-sm font-extrabold text-on-surface"
              : "text-xs font-black uppercase tracking-widest text-on-surface-variant"
          }
        >
          Lịch sử đổi thưởng
        </p>
        {isDesktop && !isLoading && claims.length > 0 && (
          <span className="text-xs text-on-surface-variant">
            {Math.min(claims.length, 3)} gần nhất
          </span>
        )}
      </div>
      {isDesktop && (
        <p className="-mt-2 mb-3 text-xs text-on-surface-variant">
          Các phần thưởng đã đổi và mã nhận quà
        </p>
      )}
      {isLoading ? (
        <div className={`space-y-2 ${isDesktop ? "lg:space-y-1.5" : ""}`}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`flex animate-pulse items-center justify-between rounded-xl bg-surface-container px-3 py-3 ${isDesktop ? "mb-2" : ""}`}
            >
              <div className="space-y-2">
                <div className="h-3 w-32 rounded-full bg-surface-container" />
                <div className="h-2.5 w-20 rounded-full bg-surface-container" />
              </div>
              <div className="h-3 w-16 rounded-full bg-surface-container" />
            </div>
          ))}
        </div>
      ) : claims.length === 0 ? (
        <p className="py-6 text-center text-xs text-on-surface-variant">
          Chưa có giao dịch nào
        </p>
      ) : (
        <div
          className={
            isDesktop
              ? "relative space-y-2 pl-4 before:absolute before:bottom-4 before:left-[5px] before:top-4 before:w-px before:bg-surface-container-high"
              : "space-y-2"
          }
        >
          {visibleClaims.map((c) => (
            <div
              key={c.id}
              className={
                isDesktop
                  ? "relative rounded-lg border border-surface-container-high bg-surface-container-low px-2.5 py-2"
                  : "flex items-center justify-between rounded-xl bg-surface-container-lowest px-4 py-3 shadow-ambient-sm"
              }
            >
              {isDesktop ? (
                <>
                  <span
                    className={`absolute -left-4 top-3 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-white ring-1 ${c.voucherCode ? "bg-primary ring-primary-fixed" : "bg-secondary ring-secondary-fixed"}`}
                    aria-hidden="true"
                  />
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 break-words text-xs font-bold leading-snug text-on-surface">
                      {c.rewardName?.trim() || "Phần thưởng đã đổi"}
                    </p>
                    <span className="shrink-0 text-xs font-black text-primary">
                      −{formatPoints(c.pointsSpent)}
                    </span>
                  </div>
                  <div className="mt-1 flex min-w-0 items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 text-xs text-on-surface-variant">
                      {formatClaimDate(c.createdAt)}
                    </span>
                    {c.pointAmount ? (
                      <span className="shrink-0 text-xs font-bold text-secondary">
                        Đã cộng {formatPoints(c.pointAmount)} NSP
                      </span>
                    ) : null}
                  </div>
                  {c.voucherCode && (
                    <div className="mt-1.5 flex min-w-0 items-center gap-1 rounded-md bg-surface-container-lowest px-1.5 py-0.5">
                      <span className="shrink-0 text-xs text-on-surface-variant">Mã</span>
                      <b className="min-w-0 flex-1 truncate text-xs tracking-wide text-on-surface">
                        {c.voucherCode}
                      </b>
                      <button
                        type="button"
                        onClick={() => void copyCode(c.voucherCode!)}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center border-l border-surface-container-high pl-1.5 text-primary hover:text-primary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                        aria-label={`Sao chép mã voucher ${c.voucherCode}`}
                        title="Sao chép mã voucher"
                      >
                        {copiedCode === c.voucherCode ? (
                          <Check aria-hidden="true" size={15} className="text-emerald-600" />
                        ) : (
                          <Copy aria-hidden="true" size={15} />
                        )}
                      </button>
                    </div>
                  )}
                  {!c.voucherCode && c.productRef && (
                    <p className="mt-1 break-all text-xs text-on-surface-variant">
                      Mã nhận: {c.productRef}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-on-surface">
                      {c.rewardName}
                    </p>
                    <p className="mt-0.5 text-xs text-on-surface-variant">
                      {formatDate(c.createdAt)}
                    </p>
                  </div>
                  <div className="ml-2 flex flex-col items-end gap-0.5">
                    <span className="text-xs font-black text-rose-500">
                      -{formatPoints(c.pointsSpent)}
                    </span>
                    {c.voucherCode && (
                      <span className="text-xs font-bold text-secondary">
                        {c.voucherCode}
                      </span>
                    )}
                    {c.pointAmount && (
                      <span className="text-xs font-bold text-emerald-600">
                        +{c.pointAmount} NSP
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {isDesktop && !isLoading && claims.length > 3 && (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-full bg-surface-container py-2 text-xs font-extrabold text-primary hover:bg-surface-container-high"
        >
          {showAll ? "Thu gọn lịch sử" : "Xem toàn bộ lịch sử"}{" "}
          <ArrowDown className={showAll ? "rotate-180" : ""} size={14} />
        </button>
      )}
      {isDesktop && copyError && (
        <span className="sr-only" role="status">
          Không thể sao chép mã voucher
        </span>
      )}
    </div>
  );
}
