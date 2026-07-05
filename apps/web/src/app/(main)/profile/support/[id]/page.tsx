"use client";

import {
  SUPPORT_CATEGORY_LABEL,
  SUPPORT_STATUS_COLOR,
  SUPPORT_STATUS_LABEL,
} from "@/constants/support";
import { formatVND } from "@/lib/currency";
import { useSupportTicket } from "@/lib/react-query/support/api/useSupportQueries";
import {
  ArrowLeft,
  ChevronRight,
  Image as ImageIcon,
  MessageSquareText,
  Package,
  Tag,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { use } from "react";

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: ticket, isLoading } = useSupportTicket(id);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        <div className="flex h-9 w-full items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-xl bg-surface-container" />
          <div className="h-5 w-44 animate-pulse rounded bg-surface-container" />
        </div>
        <div className="space-y-4 rounded-2xl bg-surface-container-lowest p-2 shadow-ambient-sm">
          <div className="flex flex-wrap gap-2">
            <div className="h-6 w-20 animate-pulse rounded-lg bg-surface-container" />
            <div className="h-6 w-28 animate-pulse rounded-lg bg-surface-container" />
            <div className="h-6 w-16 animate-pulse rounded-full bg-surface-container" />
          </div>
          <div className="h-6 w-3/4 animate-pulse rounded bg-surface-container" />
          <div className="h-20 w-full animate-pulse rounded-2xl bg-surface-container" />
          <div className="space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-surface-container" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-surface-container" />
            <div className="h-3 w-4/6 animate-pulse rounded bg-surface-container" />
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-20">
        <MessageSquareText
          size={40}
          className="text-outline-variant"
          strokeWidth={1.5}
        />
        <p className="text-sm font-semibold text-on-surface-variant">
          Không tìm thấy yêu cầu hỗ trợ
        </p>
        <Link
          href="/profile/support"
          className="rounded-xl bg-primary px-4 py-2 text-[10px] font-black uppercase tracking-widest text-on-primary active:scale-95"
        >
          Quay lại
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      <div className="flex items-center gap-3">
        <Link
          href="/profile/support"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container transition-transform active:scale-90"
        >
          <ArrowLeft size={18} strokeWidth={2} />
        </Link>
        <p className="text-xl font-black tracking-tight text-on-surface">
          Chi tiết yêu cầu
        </p>
      </div>

      <div className="space-y-4 rounded-2xl bg-surface-container-lowest p-2 shadow-ambient-sm">
        <div className="p-2">
          <div className="mb-3 flex items-start justify-between gap-3">
            <p className="flex-1 text-lg font-black text-on-surface">
              {ticket.subject}
            </p>
            <span
              className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                SUPPORT_STATUS_COLOR[ticket.status]
              }`}
            >
              {SUPPORT_STATUS_LABEL[ticket.status]}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            <span className="rounded-lg bg-surface-container px-2.5 py-1">
              {SUPPORT_CATEGORY_LABEL[ticket.category]}
            </span>
            <span className="flex items-center gap-1 rounded-lg bg-surface-container px-2.5 py-1">
              {new Date(ticket.created_at).toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {ticket.resolved_at && (
              <span className="flex items-center gap-1 rounded-lg bg-surface-container px-2.5 py-1">
                Đã xử lý:{" "}
                {new Date(ticket.resolved_at).toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        </div>

        {ticket.order_order_number && (
          <Link
            href={`/profile/orders?order=${ticket.order_order_number}`}
            className="flex items-center justify-between rounded-2xl bg-surface-container px-4 py-3 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-fixed">
                <Package size={16} className="text-primary" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  Đơn hàng liên quan
                </p>
                <p className="text-sm font-bold text-primary">
                  {ticket.order_order_number}
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="text-outline-variant" />
          </Link>
        )}

        {ticket.order_item && (
          <div className="rounded-2xl bg-surface-container p-2">
            <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Sản phẩm gặp vấn đề
            </p>
            <div className="flex items-start gap-3 rounded-xl bg-surface-container-high p-3">
              {ticket.order_item.thumbnail ? (
                <div className="relative aspect-square h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-surface-container">
                  <Image
                    src={ticket.order_item.thumbnail}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
              ) : (
                <div className="flex aspect-square h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-surface-container">
                  <ImageIcon
                    size={20}
                    className="text-outline-variant"
                    strokeWidth={1.5}
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-on-surface">
                  {ticket.order_item.product_name}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-on-surface-variant">
                  <strong className="text-primary">
                    {formatVND(ticket.order_item.unit_price)}
                  </strong>
                  {ticket.order_item.quantity > 1 && (
                    <span className="ml-1 text-outline-variant">
                      x{ticket.order_item.quantity}
                    </span>
                  )}
                </p>
                {ticket.order_item.components.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {ticket.order_item.components.map((c, ci) => (
                      <span
                        key={ci}
                        className="inline-flex items-center gap-1 rounded-lg bg-surface-container px-2 py-0.5 text-[10px] font-bold text-on-surface-variant"
                      >
                        <Tag size={10} />
                        {c.variant_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {ticket.description && (
          <div className="px-2">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Mô tả
            </p>
            <p className="whitespace-pre-wrap rounded-2xl bg-surface-container px-4 py-3 text-sm leading-relaxed text-on-surface">
              {ticket.description}
            </p>
          </div>
        )}

        {ticket.admin_notes && (
          <div className="px-2">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              <MessageSquareText size={12} strokeWidth={2} />
              Phản hồi từ cửa hàng
            </p>
            <div
              className="rounded-2xl border border-primary-fixed-dim bg-primary-fixed/30 px-4 py-3 text-sm leading-relaxed text-on-surface"
              dangerouslySetInnerHTML={{ __html: ticket.admin_notes }}
            />
          </div>
        )}

        {ticket.attachments?.length > 0 && (
          <div className="px-2 pb-1">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Hình ảnh đính kèm
            </p>
            <div className="grid grid-cols-3 gap-2">
              {ticket.attachments.map(
                (att: {
                  id: string;
                  file_url: string;
                  file_name: string;
                  mime_type: string;
                }) => (
                  <a
                    key={att.id}
                    href={att.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-square overflow-hidden rounded-2xl bg-surface-container"
                  >
                    <Image
                      src={att.file_url}
                      alt={att.file_name || "Attachment"}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 33vw, 150px"
                    />
                  </a>
                )
              )}
            </div>
          </div>
        )}

        <div className="border-t border-outline-variant/30 px-2 pb-1 pt-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Mã yêu cầu
          </p>
          <p className="mt-0.5 font-mono text-xs text-outline">
            {ticket.id}
          </p>
        </div>
      </div>
    </div>
  );
}
