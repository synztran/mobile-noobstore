"use client";

import { SUPPORT_CATEGORY_LABEL, SUPPORT_STATUS_COLOR, SUPPORT_STATUS_LABEL } from "@/constants/support";
import type { SupportTicketListItem } from "@/types/support";
import Link from "next/link";

interface TicketCardProps {
  ticket: SupportTicketListItem;
}

export function TicketCard({ ticket }: TicketCardProps) {
  return (
    <Link
      href={`/profile/support/${ticket.id}`}
      className="block space-y-2 rounded-3xl bg-surface-container-lowest p-4 shadow-ambient-sm transition-transform active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="flex-1 text-sm font-bold leading-tight text-on-surface line-clamp-2">
          {ticket.subject}
        </p>
        <span
          className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
            SUPPORT_STATUS_COLOR[ticket.status]
          }`}
        >
          {SUPPORT_STATUS_LABEL[ticket.status]}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-on-surface-variant">
        <span className="rounded-md bg-surface-container px-2 py-0.5 font-semibold">
          {SUPPORT_CATEGORY_LABEL[ticket.category]}
        </span>
        <span>
          {new Date(ticket.created_at).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        {ticket.attachment_count > 0 && (
          <span className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
            {ticket.attachment_count}
          </span>
        )}
      </div>
    </Link>
  );
}
