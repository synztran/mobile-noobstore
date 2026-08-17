"use client";

import { Check, FileText, Pencil, RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import DocumentFormModal, { type DocumentFormValue } from "./DocumentFormModal";

type DocumentRow = {
  id: string;
  title: string;
  keyboard_name: string;
  version: string;
  notes: string;
  file_name: string;
  status: string;
  status_reason: string | null;
  download_count: number;
  created_at: string;
  author_name: string;
};

type Props = {
  documents: DocumentRow[];
};

export default function DocumentsTable({ documents }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<DocumentRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  function statusBadge(status: string) {
    if (status === "published") {
      return (
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
          Đã duyệt
        </span>
      );
    }
    if (status === "rejected") {
      return (
        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
          Từ chối
        </span>
      );
    }
    return (
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
        Chờ duyệt
      </span>
    );
  }

  async function act(id: string, status: string, rejectReason = "") {
    setBusyId(id);
    const res = await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reason: rejectReason }),
    });
    setBusyId(null);
    setRejectingId(null);
    setReason("");

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Thao tác thất bại");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Tài liệu
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Bàn phím
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Tác giả
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Ngày
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {documents.length > 0 ? (
              documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                      <div className="min-w-0">
                        <p className="max-w-[220px] truncate text-sm font-semibold text-slate-900">
                          {doc.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {doc.version ? `v${doc.version}` : ""}
                          {doc.file_name ? ` · ${doc.file_name}` : ""}
                        </p>
                      </div>
                    </div>
                    {doc.status === "rejected" && doc.status_reason && (
                      <p className="mt-1 text-xs text-red-600">
                        Lý do: {doc.status_reason}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {doc.keyboard_name}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {statusBadge(doc.status)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {doc.author_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(doc.created_at).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="space-x-2 px-6 py-4 text-sm">
                    {doc.status !== "published" && (
                      <button
                        type="button"
                        disabled={busyId === doc.id}
                        onClick={() => act(doc.id, "published")}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-green-600 transition-colors hover:bg-green-50 disabled:opacity-50"
                      >
                        <Check className="mr-1 inline-block h-4 w-4" />
                        Duyệt
                      </button>
                    )}
                    {doc.status === "published" && (
                      <button
                        type="button"
                        disabled={busyId === doc.id}
                        onClick={() => act(doc.id, "pending")}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
                      >
                        <RotateCcw className="mr-1 inline-block h-4 w-4" />
                        Hủy duyệt
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditing(doc)}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
                    >
                      <Pencil className="mr-1 inline-block h-4 w-4" />
                      Sửa
                    </button>
                    {rejectingId !== doc.id && (
                      <button
                        type="button"
                        disabled={busyId === doc.id}
                        onClick={() => {
                          setRejectingId(doc.id);
                          setReason("");
                        }}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                      >
                        <X className="mr-1 inline-block h-4 w-4" />
                        Từ chối
                      </button>
                    )}
                    {rejectingId === doc.id && (
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Lý do từ chối"
                          className="w-40 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        <button
                          type="button"
                          disabled={busyId === doc.id}
                          onClick={() => act(doc.id, "rejected", reason.trim())}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                        >
                          Xác nhận
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectingId(null)}
                          className="rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                        >
                          Hủy
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-8 text-center text-slate-500"
                >
                  Không có tài liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <DocumentFormModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        mode="update"
        document={
          editing
            ? (editing as DocumentFormValue)
            : undefined
        }
      />
    </>
  );
}
