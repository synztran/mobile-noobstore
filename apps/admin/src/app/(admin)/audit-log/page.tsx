"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";

interface AuditEntry {
  id: string;
  admin_user_id: string;
  admin_email: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  diff_data: Record<string, { old: unknown; new: unknown }> | null;
  ip_address: string | null;
  created_at: string | null;
}

type ActionFilter = "" | "order.update_status" | "order.bulk_update_status";

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<ActionFilter>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const params = new URLSearchParams({ page: String(page) });
  if (actionFilter) params.set("action", actionFilter);

  const { data, isFetching } = useQuery({
    queryKey: ["audit-log", page, actionFilter],
    queryFn: async () => {
      const res = await fetch(`/api/audit-log?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json() as Promise<{
        logs: AuditEntry[];
        count: number;
        page: number;
        totalPages: number;
      }>;
    },
  });

  const logs = data?.logs ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="mr-auto">
          <p className="text-3xl font-bold text-heading">Audit Log</p>
          <p className="mt-1 text-sm text-muted">
            Track all admin actions across the system
          </p>
        </div>
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value as ActionFilter);
            setPage(1);
          }}
          className="select select-bordered select-sm"
        >
          <option value="">All actions</option>
          <option value="order.update_status">Order status update</option>
          <option value="order.bulk_update_status">Bulk status update</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl table-border card-bg">
        <table className="w-full">
          <thead className="thead-bg">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted">
                Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted">
                Admin
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted">
                Action
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted">
                Entity
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted">
                IP
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="table-divide">
            {isFetching ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted">
                  <span className="loading loading-spinner loading-sm" />
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted">
                  No audit log entries found
                </td>
              </tr>
            ) : (
              logs.flatMap((entry) => {
                const rows: React.ReactNode[] = [];
                rows.push(
                  <tr
                    key={entry.id}
                    className="table-row-hover cursor-pointer"
                    onClick={() =>
                      setExpandedId(
                        expandedId === entry.id ? null : entry.id,
                      )
                    }
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">
                      {entry.created_at
                        ? new Date(entry.created_at).toLocaleString("vi-VN")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-body">
                      <div className="text-sm text-heading">{entry.admin_email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-body">
                      {entry.entity_type}
                      {entry.entity_id && (
                        <span className="ml-1 font-mono text-xs text-muted">
                          #{entry.entity_id.slice(0, 8)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {entry.ip_address ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Search className="inline-block h-4 w-4 text-muted" />
                    </td>
                  </tr>,
                );
                if (expandedId === entry.id) {
                  rows.push(
                    <tr key={`${entry.id}-detail`}>
                      <td colSpan={6} className="bg-slate-50 dark:bg-slate-800/40 px-6 py-4">
                        <div className="space-y-3 text-sm">
                          {entry.diff_data && (
                            <div>
                              <p className="mb-1 font-semibold text-heading">
                                Changes
                              </p>
                              <div className="space-y-1 rounded border table-border card-bg p-3 font-mono text-xs">
                                {Object.entries(entry.diff_data).map(
                                  ([field, change]) => (
                                    <div
                                      key={field}
                                      className="flex gap-2"
                                    >
                                      <span className="w-32 shrink-0 font-semibold text-muted">
                                        {field}
                                      </span>
                                      <span className="text-red-500 line-through">
                                        {JSON.stringify(change.old)}
                                      </span>
                                      <span className="text-slate-300 dark:text-slate-600">
                                        →
                                      </span>
                                      <span className="text-green-600 dark:text-green-400">
                                        {JSON.stringify(change.new)}
                                      </span>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                          <div className="flex gap-6 text-xs text-muted">
                            <span>
                              Log ID:{" "}
                              <span className="font-mono">{entry.id}</span>
                            </span>
                            <span>
                              Entity ID:{" "}
                              <span className="font-mono">
                                {entry.entity_id ?? "—"}
                              </span>
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>,
                  );
                }
                return rows;
              }))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted">
            {data?.count ?? 0} entries · Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-sm btn-ghost"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 || p === totalPages || Math.abs(p - page) <= 1,
              )
              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1)
                  acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…" ? (
                  <span
                    key={`e-${i}`}
                    className="px-2 text-sm text-muted"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`btn btn-sm ${
                      p === page ? "btn-primary" : "btn-ghost"
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}
            <button
              onClick={() =>
                setPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={page === totalPages}
              className="btn btn-sm btn-ghost"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}