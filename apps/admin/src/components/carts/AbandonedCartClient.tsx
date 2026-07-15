"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Bell,
  ShoppingBag,
  Clock,
  User,
} from "lucide-react";
import { formatVND } from "@/lib/currency";

interface AbandonedCart {
  id: string;
  user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  user: { id: string; email: string; first_name: string | null; last_name: string | null } | null;
  itemCount: number;
  total: number;
}

interface Props {
  carts: AbandonedCart[];
  count: number;
  currentPage: number;
  totalPages: number;
}

export default function AbandonedCartClient({
  carts,
  currentPage,
  totalPages,
}: Props) {
  const router = useRouter();
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [bulkSending, setBulkSending] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function goToPage(page: number) {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    router.push(`/carts/abandoned?${params.toString()}`);
  }

  async function sendReminder(cartId: string, userId: string | null) {
    if (!userId) return;
    setSending((prev) => ({ ...prev, [cartId]: true }));
    setResult(null);

    try {
      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title: "Bạn còn hàng trong giỏ! 🛒",
          body: "Giỏ hàng của bạn vẫn đang chờ. Xem ngay trước khi hết hàng!",
          deepLink: "/cart",
          type: "abandoned_cart",
        }),
      });

      if (!res.ok) throw new Error("Failed to send reminder");
      setResult({ type: "success", message: "Đã gửi nhắc nhở thành công!" });
    } catch {
      setResult({ type: "error", message: "Gửi nhắc nhở thất bại" });
    } finally {
      setSending((prev) => ({ ...prev, [cartId]: false }));
    }
  }

  async function sendBulkReminder() {
    const targetCarts = selected.size > 0
      ? carts.filter((c) => selected.has(c.id))
      : carts;
    const withUsers = targetCarts.filter((c) => c.user_id);
    if (withUsers.length === 0) return;

    setBulkSending(true);
    setResult(null);
    let successCount = 0;

    for (const cart of withUsers) {
      try {
        const res = await fetch("/api/notifications/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: cart.user_id,
            title: "Bạn còn hàng trong giỏ! 🛒",
            body: "Giỏ hàng của bạn vẫn đang chờ. Xem ngay trước khi hết hàng!",
            deepLink: "/cart",
            type: "abandoned_cart",
          }),
        });
        if (res.ok) successCount++;
      } catch {
        // Continue with next
      }
    }

    setResult({
      type: "success",
      message: `Đã gửi nhắc nhở cho ${successCount}/${withUsers.length} khách hàng`,
    });
    setBulkSending(false);
    setSelected(new Set());
  }

  function toggleSelect(cartId: string) {
    const next = new Set(selected);
    if (next.has(cartId)) next.delete(cartId);
    else next.add(cartId);
    setSelected(next);
  }

  const hoursSince = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const hours = Math.floor(
      (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60)
    );
    if (hours < 24) return `${hours} giờ`;
    const days = Math.floor(hours / 24);
    return `${days} ngày`;
  };

  return (
    <div className="space-y-4">
      {result && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-semibold ${
            result.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {result.message}
          <button
            onClick={() => setResult(null)}
            className="ml-3 text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Bulk actions */}
      {carts.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={sendBulkReminder}
            disabled={bulkSending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {bulkSending ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <Bell size={16} />
            )}
            {selected.size > 0
              ? `Gửi nhắc (${selected.size})`
              : "Gửi nhắc tất cả"}
          </button>
          <span className="text-xs text-slate-400">
            {selected.size > 0
              ? `Đã chọn ${selected.size}`
              : `${carts.length} giỏ hàng`}
          </span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <th className="px-3 py-3 w-10">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelected(new Set(carts.map((c) => c.id)));
                    } else {
                      setSelected(new Set());
                    }
                  }}
                  checked={selected.size === carts.length && carts.length > 0}
                  className="checkbox checkbox-sm"
                />
              </th>
              <th className="px-4 py-3">Khách hàng</th>
              <th className="px-4 py-3">Số lượng</th>
              <th className="px-4 py-3">Giá trị</th>
              <th className="px-4 py-3">Bỏ quên</th>
              <th className="px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {carts.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  <ShoppingBag
                    size={24}
                    className="mx-auto mb-2 text-slate-300"
                  />
                  Không có giỏ hàng nào bị bỏ quên
                </td>
              </tr>
            ) : (
              carts.map((cart) => (
                <tr
                  key={cart.id}
                  className="border-b border-slate-100 transition-colors hover:bg-slate-50"
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(cart.id)}
                      onChange={() => toggleSelect(cart.id)}
                      className="checkbox checkbox-sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-slate-400 shrink-0" />
                      <div>
                        <p className="font-medium text-slate-900">
                          {cart.user
                            ? [cart.user.first_name, cart.user.last_name]
                                .filter(Boolean)
                                .join(" ") || "—"
                            : "Khách vãng lai"}
                        </p>
                        {cart.user && (
                          <p className="text-xs text-slate-400">
                            {cart.user.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-700">
                      {cart.itemCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {formatVND(cart.total)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock size={12} />
                      {hoursSince(cart.updated_at)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => sendReminder(cart.id, cart.user_id)}
                      disabled={
                        sending[cart.id] || !cart.user_id
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-40"
                    >
                      {sending[cart.id] ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        <Bell size={12} />
                      )}
                      Nhắc nhở
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="rounded-lg bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(
              (p) =>
                p === 1 ||
                p === totalPages ||
                Math.abs(p - currentPage) <= 2
            )
            .map((p, idx, arr) => (
              <span key={p} className="flex items-center gap-1">
                {idx > 0 && arr[idx - 1] !== p - 1 && (
                  <span className="px-1 text-slate-300">...</span>
                )}
                <button
                  onClick={() => goToPage(p)}
                  className={`min-w-[32px] rounded-lg px-2 py-1 text-sm font-semibold transition-colors ${
                    p === currentPage
                      ? "bg-primary text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {p}
                </button>
              </span>
            ))}
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="rounded-lg bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
