"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquareText, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import RichTextEditor from "@/components/ui/RichTextEditor";
import { sanitizeHtml } from "@/lib/sanitize";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-info/10 text-info",
  in_progress: "bg-warning/10 text-warning",
  resolved: "bg-success/10 text-success",
  closed: "bg-base-300 text-base-content/60",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Mở",
  in_progress: "Đang xử lý",
  resolved: "Đã giải quyết",
  closed: "Đã đóng",
};

const STATUS_TABS = [
  { value: "", label: "Tất cả" },
  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

interface TicketListItem {
  id: string;
  subject: string;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  order_id: string | null;
  user_id: string;
  attachment_count: number;
}

interface TicketsResponse {
  tickets: TicketListItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  defective: "Lỗi",
  wrong_item: "Sai SP",
  missing_item: "Thiếu SP",
  shipping: "Vận chuyển",
  other: "Khác",
};

export function TicketsList() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<TicketsResponse>({
    queryKey: ["admin-support-tickets", status, page, q],
    queryFn: async () => {
      const sp = new URLSearchParams({ page: String(page), limit: "20" });
      if (status) sp.set("status", status);
      if (q) sp.set("q", q);
      const res = await fetch(`/api/support/tickets?${sp}`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const tickets = data?.tickets ?? [];
  const totalPages = data?.total_pages ?? 0;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-base-content">
          Hỗ trợ khách hàng
        </h1>
      </div>

      <div className="mb-4 flex items-center gap-4">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50"
          />
          <input
            type="text"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm kiếm..."
            className="w-full rounded-lg border border-base-300 bg-base-100 py-2 pl-9 pr-8 text-sm text-base-content outline-none focus:border-base-content/50"
          />
          {q && (
            <button
              onClick={() => {
                setQ("");
                setPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X size={14} className="text-base-content/50" />
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              status === tab.value
                ? "bg-base-content text-base-100"
                : "bg-base-200 text-base-content/70 hover:bg-base-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-base-300 text-xs font-bold uppercase tracking-wider text-base-content/60">
                <th className="pb-3 pr-4">Tiêu đề</th>
                <th className="pb-3 pr-4">Danh mục</th>
                <th className="pb-3 pr-4">Trạng thái</th>
                <th className="pb-3 pr-4">Ngày tạo</th>
                <th className="pb-3 pr-4">File</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4].map((i) => (
                <tr key={i}>
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <td key={j} className="py-3 pr-4">
                      <div className="h-4 w-full animate-pulse rounded bg-base-200" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-base-content/50">
          <MessageSquareText size={32} />
          <p className="text-sm">Chưa có yêu cầu hỗ trợ nào</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-base-300 text-xs font-bold uppercase tracking-wider text-base-content/60">
                <th className="pb-3 pr-4">Tiêu đề</th>
                <th className="pb-3 pr-4">Danh mục</th>
                <th className="pb-3 pr-4">Trạng thái</th>
                <th className="pb-3 pr-4">Ngày tạo</th>
                <th className="pb-3 pr-4">File</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="border-b border-base-200">
                  <td className="py-3 pr-4">
                    <p className="truncate font-medium text-base-content">
                      {t.subject}
                    </p>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="rounded-md bg-base-200 px-2 py-0.5 text-xs text-base-content/70">
                      {CATEGORY_LABELS[t.category] ?? t.category}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_COLORS[t.status] ?? ""}`}
                    >
                      {STATUS_LABELS[t.status] ?? t.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-xs text-base-content/60">
                    {new Date(t.created_at).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="py-3 pr-4 text-xs text-base-content/60">
                    {t.attachment_count > 0 ? `${t.attachment_count} file` : ""}
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => setSelectedId(t.id)}
                      className="rounded-lg bg-base-content px-3 py-1.5 text-xs font-bold text-base-100 transition-all hover:bg-base-content/80"
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                p === page
                  ? "bg-base-content text-base-100"
                  : "bg-base-200 text-base-content/70 hover:bg-base-300"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {selectedId && (
        <TicketDetailModal
          ticketId={selectedId}
          onClose={() => {
            setSelectedId(null);
            queryClient.invalidateQueries({
              queryKey: ["admin-support-tickets"],
            });
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function TicketDetailModal({
  ticketId,
  onClose,
}: {
  ticketId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["admin-support-ticket", ticketId],
    queryFn: async () => {
      const res = await fetch(`/api/support/tickets/${ticketId}`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const { data: orderData } = useQuery({
    queryKey: ["admin-order", ticket?.order_id],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${ticket.order_id}`);
      if (!res.ok) throw new Error("Failed to load order");
      return res.json();
    },
    enabled: !!ticket?.order_id,
  });

  useEffect(() => {
    if (ticket?.admin_notes) setNotes(ticket.admin_notes);
  }, [ticket?.admin_notes]);

  const orderCustomer = orderData?.users
    ? {
        userId: orderData.user_id ?? null,
        name: [orderData.users.first_name, orderData.users.last_name]
          .filter(Boolean)
          .join(" "),
        email: orderData.users.email,
        phone: orderData.users.phone_number,
      }
    : null;

  async function handleSaveNotes() {
    if (!notes.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/support/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ admin_notes: sanitizeHtml(notes) }),
    });
    setSaving(false);
    if (!res.ok) {
      alert("Failed to save notes");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
    queryClient.invalidateQueries({
      queryKey: ["admin-support-ticket", ticketId],
    });
    router.refresh();
  }

  async function handleUpdate(status?: string, adminNotes?: string) {
    setSaving(true);
    const body: Record<string, string> = {};
    if (status) body.status = status;
    if (adminNotes !== undefined) body.admin_notes = adminNotes;

    const res = await fetch(`/api/support/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      alert("Failed to update");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
    queryClient.invalidateQueries({
      queryKey: ["admin-support-ticket", ticketId],
    });
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-300/50 backdrop-blur-sm">
      <div className="mx-4 max-h-[85vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-base-100 p-6 shadow-xl" data-theme="light">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-base-content">
            Chi tiết yêu cầu
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-base-200"
          >
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-[1fr_300px] gap-6">
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-5 w-3/4 animate-pulse rounded bg-base-200" />
              ))}
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-5 w-full animate-pulse rounded bg-base-200" />
              ))}
            </div>
          </div>
        ) : ticket ? (
          <div className="grid grid-cols-[1fr_300px] gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-base-content/60">Tiêu đề</p>
                <p className="font-bold text-base-content">{ticket.subject}</p>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-2">
                <div>
                  <p className="text-sm text-base-content/60">Danh mục</p>
                  <span className="rounded-md bg-base-200 px-2 py-0.5 text-xs font-medium text-base-content/70">
                    {CATEGORY_LABELS[ticket.category] ?? ticket.category}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Trạng thái</p>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold uppercase ${STATUS_COLORS[ticket.status] ?? ""}`}
                  >
                    {STATUS_LABELS[ticket.status] ?? ticket.status}
                  </span>
                </div>
                {ticket.order_order_number && (
                  <div>
                    <p className="text-sm text-base-content/60">Đơn hàng</p>
                    <p className="font-medium text-primary">
                      {ticket.order_order_number}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-base-content/60">Ngày tạo</p>
                  <p className="text-sm text-base-content">
                    {new Date(ticket.created_at).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              {ticket.description && (
                <div>
                  <p className="text-sm text-base-content/60">Mô tả</p>
                  <p className="whitespace-pre-wrap rounded-lg bg-base-200 p-3 text-sm text-base-content">
                    {ticket.description}
                  </p>
                </div>
              )}

              {ticket.admin_notes && (
                <div>
                  <p className="mb-1 text-sm text-base-content/60">
                    Phản hồi trước đó
                  </p>
                  <div
                    className="prose prose-sm max-w-none rounded-lg bg-base-200 p-3 text-base-content"
                    dangerouslySetInnerHTML={{ __html: ticket.admin_notes }}
                  />
                </div>
              )}

              <div className="border-t border-base-300 pt-4">
                <p className="mb-2 text-sm font-bold text-base-content">
                  Phản hồi khách hàng
                </p>
                <RichTextEditor
                  value={notes}
                  onChange={setNotes}
                  placeholder="Nhập nội dung phản hồi..."
                  rows={4}
                />
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={handleSaveNotes}
                    disabled={saving || !notes.trim()}
                    className="btn btn-primary btn-sm"
                  >
                    {saving ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : null}
                    Lưu phản hồi
                  </button>
                </div>
              </div>

              <div className="border-t border-base-300 pt-4">
                <p className="mb-2 text-sm font-bold text-base-content">
                  Cập nhật trạng thái
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_LABELS).map(([val, label]) => (
                    <button
                      key={val}
                      disabled={saving || val === ticket.status}
                      onClick={() => handleUpdate(val, sanitizeHtml(notes))}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                        val === ticket.status
                          ? "cursor-not-allowed bg-base-300 text-base-content/50"
                          : "bg-base-content text-base-100 hover:bg-base-content/80"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {ticket.user_full_name && (
                <div className="rounded-lg bg-base-200 p-3">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-base-content/60">
                    Khách hàng
                  </p>
                  <p className="font-medium text-base-content">
                    {ticket.user_full_name}
                  </p>
                  {ticket.user_email && (
                    <p className="text-xs text-base-content/60">
                      {ticket.user_email}
                    </p>
                  )}
                </div>
              )}

              {orderCustomer && (
                <div className="rounded-lg bg-base-200 p-3">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-base-content/60">
                    Chủ đơn hàng
                  </p>
                  <p className="font-medium text-base-content">
                    {orderCustomer.name}
                  </p>
                  {orderCustomer.userId && (
                    <p className="text-[10px] font-mono text-base-content/40">
                      ID: {orderCustomer.userId}
                    </p>
                  )}
                  {orderCustomer.email && (
                    <p className="text-xs text-base-content/60">
                      {orderCustomer.email}
                    </p>
                  )}
                  {orderCustomer.phone && (
                    <p className="text-xs text-base-content/60">
                      {orderCustomer.phone}
                    </p>
                  )}
                </div>
              )}

              {ticket.order_item && (
                <div>
                  <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-base-content/60">
                    Sản phẩm gặp vấn đề
                  </p>
                  <div className="flex items-start gap-3 rounded-lg bg-base-200 p-3">
                    {ticket.order_item.thumbnail && (
                      <img
                        src={ticket.order_item.thumbnail}
                        alt=""
                        className="h-16 w-16 flex-shrink-0 rounded-lg bg-base-300 object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-base-content">
                        {ticket.order_item.product_name}
                      </p>
                      <p className="mt-0.5 text-xs text-base-content/70">
                        {new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }).format(ticket.order_item.unit_price)}
                        {ticket.order_item.quantity > 1 &&
                          ` x${ticket.order_item.quantity}`}
                      </p>
                      {ticket.order_item.components.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {ticket.order_item.components.map(
                            (c: { variant_name: string }, ci: number) => (
                              <span
                                key={ci}
                                className="rounded-md bg-base-300 px-1.5 py-0.5 text-[10px] font-bold text-base-content/70"
                              >
                                {c.variant_name}
                              </span>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {ticket.attachments?.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-base-content/60">
                    Hình ảnh đính kèm
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ticket.attachments.map(
                      (att: { id: string; file_url: string }) => (
                        <a
                          key={att.id}
                          href={att.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block h-20 w-20 overflow-hidden rounded-lg bg-base-200"
                        >
                          <img
                            src={att.file_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </a>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-base-content/50">
            Không tìm thấy
          </div>
        )}
      </div>
    </div>
  );
}
