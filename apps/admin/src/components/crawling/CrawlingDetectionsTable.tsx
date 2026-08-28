"use client";

import { sanitizeHtml } from "@/lib/sanitize";
import { Check, Eye, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type DetectionRow = {
  id: string;
  source_id: string;
  content_hash: string;
  detected_title: string | null;
  detected_content: string;
  detected_url: string | null;
  status: string;
  release_id: string | null;
  created_at: string | null;
  source: { name: string; vendor_id: string | null; type: string | null } | null;
};

type Props = {
  detections: DetectionRow[];
};

function trimContent(html: string, max = 200): string {
  const text = html.replace(/<[^>]*>/g, "").trim();
  return text.length > max ? text.slice(0, max) + "..." : text;
}

export default function CrawlingDetectionsTable({ detections }: Props) {
  const router = useRouter();
  const [processing, setProcessing] = useState<string | null>(null);
  const [preview, setPreview] = useState<DetectionRow | null>(null);

  const pending = detections.filter((d) => d.status === "pending");
  const history = detections.filter((d) => d.status !== "pending");

  async function handleAction(
    id: string,
    action: "approved" | "rejected"
  ) {
    setProcessing(id);

    let releaseId: string | null = null;

    if (action === "approved") {
      const detection = detections.find((d) => d.id === id);
      if (!detection) return;

      const res = await fetch("/api/crawling/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: detection.detected_title || "New Release",
          content: detection.detected_content,
          source_url: detection.detected_url,
          maker_name: detection.source?.name || null,
          vendor_id: detection.source?.vendor_id || null,
          type: detection.source?.type || "NEW_RELEASE",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data?.error ?? "Failed to create release");
        setProcessing(null);
        return;
      }
      releaseId = data.id;
    }

    const res = await fetch(`/api/crawling/detections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action, release_id: releaseId }),
    });

    setProcessing(null);

    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Action failed");
    }
  }

  function statusBadge(status: string) {
    if (status === "pending")
      return (
        <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
          Pending
        </span>
      );
    if (status === "approved")
      return (
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
          Approved
        </span>
      );
    return (
      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
        Rejected
      </span>
    );
  }

  function renderPreviewModal() {
    if (!preview) return null;
    return (
      <div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={() => setPreview(null)} />
        <div className="relative mx-4 flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
            <p className="text-lg font-semibold text-slate-900">
              {preview.detected_title || "Preview"}
            </p>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="rounded-lg p-1 transition-colors hover:bg-slate-100"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {preview.detected_url && (
              <p className="mb-4 text-sm text-slate-500">
                Source:{" "}
                <a
                  href={preview.detected_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  {preview.detected_url}
                </a>
              </p>
            )}
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(preview.detected_content ?? ""),
              }}
            />
          </div>
          <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {renderPreviewModal()}

      {/* Pending */}
      <div>
        <p className="mb-3 text-sm font-semibold text-slate-700">
          Pending Review ({pending.length})
        </p>
        {pending.length > 0 ? (
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Content
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Detected
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pending.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {d.source?.name || "Unknown"}
                    </td>
                    <td className="max-w-xs truncate px-6 py-4 text-sm font-medium text-slate-900">
                      {d.detected_title || "Untitled"}
                    </td>
                    <td className="max-w-xs truncate px-6 py-4 text-sm text-slate-500">
                      {trimContent(d.detected_content)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {d.created_at
                        ? new Date(d.created_at).toLocaleString("vi-VN")
                        : "-"}
                    </td>
                    <td className="space-x-1 px-6 py-4 text-sm">
                      <button
                        type="button"
                        onClick={() => setPreview(d)}
                        className="rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                      >
                        <Eye className="mr-1 inline-block h-3 w-3" />
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(d.id, "approved")}
                        disabled={processing === d.id}
                        className="rounded-lg px-2 py-1.5 text-xs font-medium text-green-600 transition-colors hover:bg-green-50 disabled:opacity-50"
                      >
                        <Check className="mr-1 inline-block h-3 w-3" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(d.id, "rejected")}
                        disabled={processing === d.id}
                        className="rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                      >
                        <X className="mr-1 inline-block h-3 w-3" />
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg bg-white px-6 py-8 text-center text-sm text-slate-500 shadow">
            No pending detections. Sources will check for changes on their schedule.
          </div>
        )}
      </div>

      {/* History */}
      <div>
        <p className="mb-3 text-sm font-semibold text-slate-700">
          History ({history.length})
        </p>
        {history.length > 0 ? (
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Detected
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {history.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {d.source?.name || "Unknown"}
                    </td>
                    <td className="max-w-xs truncate px-6 py-4 text-sm text-slate-900">
                      {d.detected_title || "Untitled"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {statusBadge(d.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {d.created_at
                        ? new Date(d.created_at).toLocaleString("vi-VN")
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg bg-white px-6 py-8 text-center text-sm text-slate-500 shadow">
            No history yet.
          </div>
        )}
      </div>
    </div>
  );
}
