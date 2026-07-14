"use client";

import { Pencil, Play, Trash2, Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CrawlingSourceFormModal from "./CrawlingSourceFormModal";

type VendorRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

type SourceRow = {
  id: string;
  name: string;
  url: string;
  selector: string | null;
  schedule_days: number[];
  schedule_time: string;
  category: string;
  author: string;
  status: string;
  watch_id: string | null;
  type: string;
  vendor_id: string | null;
  vendor: VendorRow | null;
  last_content_hash: string | null;
  last_crawled_at: string | null;
};

type Props = {
  sources: SourceRow[];
};

const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export default function CrawlingSourcesTable({ sources }: Props) {
  const router = useRouter();
  const [editSource, setEditSource] = useState<SourceRow | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this crawling source? History will also be removed.")) return;
    setDeleting(id);

    const res = await fetch(`/api/crawling/sources/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Failed to delete");
    }
    setDeleting(null);
  }

  async function handleRunNow(id: string) {
    setRunning(id);

    const res = await fetch(`/api/crawling/sources/${id}/run`, { method: "POST" });
    const data = await res.json();
    setRunning(null);

    alert(
      data.status === "success"
        ? "New content detected! Check the Detections tab."
        : data.status === "no_change"
          ? "No changes detected."
          : `Error: ${data.message || "Unknown"}`
    );
    router.refresh();
  }

  function statusBadge(status: string) {
    if (status === "active") {
      return (
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
          Active
        </span>
      );
    }
    return (
      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
        Paused
      </span>
    );
  }

  function formatDays(days: number[]) {
    return DAY_LABELS.filter((_, i) => days.includes(i)).join(", ");
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Source
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Schedule
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Last Crawled
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sources.length > 0 ? (
              sources.map((source) => (
                <tr key={source.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 shrink-0 text-slate-400" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {source.name}
                        </p>
                        <p className="max-w-xs truncate text-xs text-slate-500">
                          {source.url}
                        </p>
                        {source.watch_id && (
                          <p className="truncate text-xs text-slate-400">
                            Watch: <span className="font-mono">{source.watch_id}</span>
                          </p>
                        )}
                                      {source.selector && (
                          <p className="text-xs text-slate-400">
                            Selector: {source.selector}
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {source.vendor && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                              {source.vendor.logo_url && (
                                <img src={source.vendor.logo_url} alt="" className="h-3 w-3 rounded-full object-cover" />
                              )}
                              {source.vendor.name}
                            </span>
                          )}
                          {source.type === "SALE" && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">SALE</span>
                          )}
                          {source.type === "GROUP_BUY" && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">GB</span>
                          )}
                          {source.type === "NEW_RELEASE" && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">NEW</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <p>{formatDays(source.schedule_days)}</p>
                    <p className="text-xs text-slate-400">{source.schedule_time}</p>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {statusBadge(source.status)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {source.last_crawled_at
                      ? new Date(source.last_crawled_at).toLocaleString("vi-VN")
                      : "-"}
                  </td>
                  <td className="space-x-2 px-6 py-4 text-sm">
                    <button
                      type="button"
                      onClick={() => handleRunNow(source.id)}
                      disabled={running === source.id}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-green-600 transition-colors hover:bg-green-50 disabled:opacity-50"
                    >
                      <Play className="mr-1 inline-block h-4 w-4" />
                      {running === source.id ? "..." : "Run"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditSource(source)}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
                    >
                      <Pencil className="mr-1 inline-block h-4 w-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(source.id)}
                      disabled={deleting === source.id}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="mr-1 inline-block h-4 w-4" />
                      {deleting === source.id ? "..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  No crawling sources configured. Add one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CrawlingSourceFormModal
        open={editSource !== null}
        onClose={() => setEditSource(null)}
        mode="update"
        source={editSource ?? undefined}
      />
    </>
  );
}
