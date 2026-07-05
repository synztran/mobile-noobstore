"use client";

import { TicketCard } from "@/components/support/TicketCard";
import { useSupportTickets } from "@/lib/react-query/support/api/useSupportQueries";
import { Loader2, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const STATUS_TABS = [
  { value: "", label: "Tất cả" },
  { value: "open", label: "Đã gửi" },
  { value: "in_progress", label: "Đang xử lý" },
  { value: "resolved", label: "Đã giải quyết" },
  { value: "closed", label: "Đã đóng" },
];

export default function SupportListPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSupportTickets({
    page,
    limit: 20,
    status: status || undefined,
  });

  const tickets = data?.tickets ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 0;

  return (
    <div className="space-y-4 p-4">
      <div className="sticky top-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container transition-transform active:scale-90"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </Link>
          <div>
            <p className="text-xl font-black tracking-tight text-on-surface">
              Hỗ trợ
            </p>
            {!isLoading && (
              <p className="text-xs text-on-surface-variant">{total} yêu cầu</p>
            )}
          </div>
        </div>
        <Link
          href="/profile/support/new"
          className="primary-gradient btn btn-sm max-w-max rounded-md border-0 text-xs font-bold uppercase tracking-widest text-white shadow-ambient-sm"
        >
          TẠO HỖ TRỢ
        </Link>
      </div>

      <div className="hide-scrollbar flex gap-2 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
            className={`flex-shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              status === tab.value
                ? "bg-primary text-white"
                : "bg-surface-container text-on-surface"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-outline-variant" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container">
            <MessageSquareText size={28} className="text-outline-variant" />
          </div>
          <p className="text-sm font-semibold text-on-surface-variant">
            Chưa có yêu cầu hỗ trợ nào
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold transition-all ${
                page === p
                  ? "bg-primary text-white"
                  : "bg-surface-container text-on-surface"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
