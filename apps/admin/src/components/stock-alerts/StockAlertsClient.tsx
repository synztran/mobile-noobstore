"use client";

import ExportCSVButton from "@/components/ui/ExportCSVButton";
import type { ExportColumn } from "@/lib/csv";
import { adminQueryKeys } from "@/lib/react-query/root";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface Subscription {
  id: string;
  user_id: string;
  product_id: string;
  variant_id: string | null;
  notified_at: string | null;
  created_at: string;
  users: {
    email: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  products: {
    name: string;
    slug: string;
    thumbnail: string | null;
  } | null;
}

interface ApiResponse {
  subscriptions: Subscription[];
  count: number;
  page: number;
  totalPages: number;
}

async function fetchStockAlerts(page: number): Promise<ApiResponse> {
  const res = await fetch(`/api/stock-alerts?page=${page}`);
  if (!res.ok) throw new Error("Failed to fetch stock alerts");
  return res.json();
}

export default function StockAlertsClient() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [notifying, setNotifying] = useState<string | null>(null);

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: adminQueryKeys.stockAlerts.list(page),
    queryFn: () => fetchStockAlerts(page),
    staleTime: 30_000,
  });

  const subscriptions = data?.subscriptions ?? [];
  const totalPages = data?.totalPages ?? 1;

  const handleMarkNotified = async (sub: Subscription) => {
    setNotifying(sub.id);
    try {
      const res = await fetch(`/api/stock-alerts/${sub.id}`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
      // Send push notification to the user
      await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Hàng đã về!",
          body: sub.products
            ? `${sub.products.name} đã có hàng trở lại`
            : "Sản phẩm bạn quan tâm đã có hàng",
          target: "single",
          userId: sub.user_id,
          type: "stock_alert",
          deepLink: sub.products
            ? `/shop/${sub.products.slug}`
            : "/wishlist",
        }),
      });
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.stockAlerts.list(page),
      });
    } catch (err) {
      console.error("Failed to mark notified:", err);
    } finally {
      setNotifying(null);
    }
  };

  const exportColumns: ExportColumn<Subscription>[] = [
    { label: "User Email", accessor: (s) => s.users?.email ?? "" },
    {
      label: "User Name",
      accessor: (s) =>
        `${s.users?.first_name ?? ""} ${s.users?.last_name ?? ""}`.trim(),
    },
    { label: "Product", accessor: (s) => s.products?.name ?? s.product_id },
    { label: "Notified", accessor: (s) => (s.notified_at ? "Yes" : "No") },
    { label: "Subscribed", accessor: (s) => s.created_at },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="mr-auto text-3xl font-bold text-heading">
          Stock Alerts
        </h1>
        <ExportCSVButton
          data={subscriptions}
          columns={exportColumns}
          filename="stock-alerts"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg bg-slate-200 "
            />
          ))}
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="rounded-lg bg-white px-6 py-12 text-center text-slate-500 shadow">
          No stock alert subscriptions yet
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-heading">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-heading">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-heading">
                    Subscribed
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-heading">
                    Status
                  </th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-body">
                      <p className="font-medium text-heading">
                        {sub.users
                          ? `${sub.users.first_name ?? ""} ${sub.users.last_name ?? ""}`.trim()
                          : "—"}
                      </p>
                      <p className="text-muted">{sub.users?.email ?? ""}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-body">
                      {sub.products ? (
                        <Link
                          href={`/products?q=${encodeURIComponent(sub.products.name)}`}
                          className="text-blue-600 hover:underline"
                        >
                          {sub.products.name}
                        </Link>
                      ) : (
                        sub.product_id
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted">
                      {new Date(sub.created_at).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {sub.notified_at ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                          <Check size={12} />
                          Notified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {!sub.notified_at && (
                        <button
                          onClick={() => handleMarkNotified(sub)}
                          disabled={notifying === sub.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                        >
                          {notifying === sub.id ? (
                            <span className="loading loading-spinner loading-xs" />
                          ) : (
                            <Bell size={12} />
                          )}
                          Notify
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ‹ Previous
              </button>
              <span className="text-sm text-muted">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
