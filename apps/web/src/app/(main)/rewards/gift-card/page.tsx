"use client";

import { withAuthRedirect } from "@/components/auth/withAuthRedirect";
import { usePointsBalance } from "@/lib/react-query/points/api/usePointsQueries";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle,
  Gift,
  Ticket,
  Wallet,
  XCircle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

function GiftCardPage() {
  const queryClient = useQueryClient();
  const { data: balance = 0, isLoading: balanceLoading } = usePointsBalance();

  const [code, setCode] = useState("");
  const [typedCode, setTypedCode] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [result, setResult] = useState<{
    pointsCredited: number;
    newBalance: number;
    code: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkQuery = useQuery<{ code: string; pointsValue: number }>({
    queryKey: ["gift-card-check", typedCode],
    queryFn: async () => {
      const res = await fetch(
        `/api/gift-cards/check?code=${encodeURIComponent(typedCode)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kiểm tra thẻ thất bại");
      return data;
    },
    enabled: typedCode.length > 0,
    retry: false,
  });

  const redeemMutation = useMutation({
    mutationFn: async (redeemCode: string) => {
      const res = await fetch("/api/gift-cards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: redeemCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nạp thẻ thất bại");
      return data as {
        giftCardId: number;
        pointsCredited: number;
        newBalance: number;
      };
    },
    onSuccess: (data) => {
      setResult({ ...data, code: typedCode });
      setShowConfirm(false);
      setShowSuccess(true);
      setCode("");
      setTypedCode("");
      queryClient.invalidateQueries({ queryKey: ["points"] });
      queryClient.invalidateQueries({ queryKey: ["gift-card"] });
    },
    onError: (err: Error) => {
      setError(err.message);
      setShowConfirm(false);
    },
  });

  const handleCheck = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setTypedCode(trimmed);
    setError(null);
  };

  const handleConfirm = () => {
    if (!typedCode) return;
    redeemMutation.mutate(typedCode);
  };

  const clearCheck = () => {
    setTypedCode("");
    setError(null);
  };

  return (
    <div className="space-y-5 px-4 pb-24 pt-2">
      {/* Header */}
      <div className="mb-2 flex items-center gap-3">
        <Link
          href="/rewards"
          aria-label="Quay lại"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container transition-transform active:scale-90"
        >
          <ArrowLeft size={18} className="text-on-surface" />
        </Link>
        <p className="text-xl font-black tracking-tight text-on-surface">
          Nạp thẻ quà tặng
        </p>
      </div>

      {/* Points Balance */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 p-5 shadow-ambient-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white/80">Số dư điểm</p>
            <p className="mt-1 text-3xl font-black text-white">
              {balanceLoading ? (
                <span className="inline-block h-8 w-28 animate-pulse rounded-full bg-white/30" />
              ) : (
                `${balance.toLocaleString("vi-VN")} điểm`
              )}
            </p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
            <Wallet size={28} className="text-white" />
          </div>
        </div>
      </div>

      {/* Info notice */}
      <div className="flex items-start gap-3 rounded-2xl bg-primary-fixed/20 px-4 py-3">
        <Sparkles size={16} className="mt-0.5 flex-shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-on-surface-variant">
          Nhập mã thẻ quà tặng để nhận điểm NSP. Mỗi thẻ chỉ được sử dụng một
          lần.
        </p>
      </div>

      {/* Code Input */}
      <div className="space-y-3">
        <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          Mã thẻ quà tặng
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
            <Ticket size={18} className="text-outline" />
          </div>
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (typedCode) clearCheck();
            }}
            placeholder="Nhập mã thẻ..."
            className="w-full rounded-2xl bg-surface-container py-4 pl-11 pr-4 text-sm font-bold text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCheck();
            }}
          />
        </div>

        {!typedCode && (
          <button
            onClick={handleCheck}
            disabled={!code.trim()}
            className="w-full rounded-xl bg-on-surface py-3.5 text-[10px] font-black uppercase tracking-widest text-surface transition-transform active:scale-95 disabled:opacity-40"
          >
            Kiểm tra thẻ
          </button>
        )}
      </div>

      {/* Loading / Error / Card Preview */}
      {typedCode && checkQuery.isLoading && (
        <div className="flex items-center justify-center py-8">
          <span className="loading loading-spinner loading-sm text-primary" />
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-error-container p-4">
          <div className="flex items-center gap-3">
            <XCircle
              size={18}
              className="mt-0.5 flex-shrink-0 text-on-error-container"
            />
            <p className="text-xs font-semibold text-on-error-container">
              {error}
            </p>
          </div>
        </div>
      )}

      {checkQuery.error && !error && (
        <div className="rounded-2xl bg-error-container p-4">
          <div className="flex items-center gap-3">
            <XCircle
              size={18}
              className="mt-0.5 flex-shrink-0 text-on-error-container"
            />
            <p className="text-xs font-semibold text-on-error-container">
              {(checkQuery.error as Error).message}
            </p>
          </div>
        </div>
      )}

      {checkQuery.data && (
        <div className="rounded-2xl bg-surface-container-lowest p-5 shadow-ambient-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-fixed/20 text-primary">
              <Gift size={24} />
            </div>
            <div>
              <p className="text-base font-black text-on-surface">
                Thẻ quà tặng
              </p>
              <p className="mt-0.5 text-xs font-bold uppercase tracking-widest text-outline">
                {typedCode}
              </p>
            </div>
          </div>

          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-surface-container px-4 py-3">
              <span className="text-xs font-bold text-on-surface-variant">
                Điểm thưởng
              </span>
              <span className="text-xl font-black text-primary">
                +{checkQuery.data.pointsValue.toLocaleString("vi-VN")}
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowConfirm(true)}
            className="primary-gradient w-full rounded-xl py-3.5 text-[10px] font-black uppercase tracking-widest text-white transition-transform active:scale-95"
          >
            Xác nhận nạp thẻ
          </button>
        </div>
      )}

      {/* Confirm Modal */}
      <dialog className={`modal ${showConfirm ? "modal-open" : ""}`}>
        <div className="modal-box rounded-2xl bg-surface p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-fixed/20 text-primary">
              <Gift size={24} />
            </div>
            <div>
              <p className="text-base font-black text-on-surface">
                Xác nhận nạp thẻ
              </p>
              <p className="mt-0.5 text-xs font-bold uppercase tracking-widest text-outline">
                {typedCode}
              </p>
            </div>
          </div>

          {checkQuery.data && (
            <div className="mb-4 rounded-xl bg-surface-container p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface-variant">
                  Điểm sẽ nhận
                </span>
                <span className="text-lg font-black text-primary">
                  +{checkQuery.data.pointsValue.toLocaleString("vi-VN")}
                </span>
              </div>
            </div>
          )}

          <p className="mb-4 text-xs text-on-surface-variant">
            Hành động này không thể hoàn tác. Điểm sẽ được cộng vào tài khoản
            của bạn ngay sau khi xác nhận.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 rounded-xl bg-surface-container py-3.5 text-[10px] font-black uppercase tracking-widest text-on-surface transition-transform active:scale-95"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirm}
              disabled={redeemMutation.isPending}
              className="primary-gradient flex-1 rounded-xl py-3.5 text-[10px] font-black uppercase tracking-widest text-white transition-transform active:scale-95 disabled:opacity-60"
            >
              {redeemMutation.isPending ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                "Xác nhận"
              )}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setShowConfirm(false)}>close</button>
        </form>
      </dialog>

      {/* Success Modal */}
      <dialog
        className={`modal modal-bottom sm:modal-middle ${showSuccess ? "modal-open" : ""}`}
      >
        <div className="modal-box rounded-2xl bg-surface p-6">
          <div className="flex flex-col items-center py-4 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle size={40} className="text-emerald-600" />
            </div>
            <p className="mb-1 text-lg font-black text-on-surface">
              Nạp thẻ thành công!
            </p>
            {result && (
              <p className="mb-6 text-sm text-on-surface-variant">
                Mã{" "}
                <span className="font-bold text-on-surface">{result.code}</span>
              </p>
            )}

            {result && (
              <div className="mb-6 w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 p-5 text-center shadow-ambient-sm">
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-white/80">
                  Điểm đã nhận
                </p>
                <p className="text-3xl font-black text-white">
                  +{result.pointsCredited.toLocaleString("vi-VN")}
                </p>
              </div>
            )}

            {result && (
              <p className="mb-4 text-xs text-on-surface-variant">
                Số điểm còn lại:{" "}
                <span className="font-bold text-on-surface">
                  {result.newBalance.toLocaleString("vi-VN")} điểm
                </span>
              </p>
            )}

            <div className="flex w-full items-center gap-2">
              <button
                className="btn flex-1"
                onClick={() => setShowSuccess(false)}
              >
                Đóng
              </button>
              <Link href="/rewards" className="btn btn-primary flex-1">
                Quay lại đổi thưởng
              </Link>
            </div>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setShowSuccess(false)}>close</button>
        </form>
      </dialog>
    </div>
  );
}

export default withAuthRedirect(GiftCardPage);
