"use client";

import { useAuth } from "@/modules/user/client/AuthProvider";
import { CalendarCheck, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { GroupAnchors } from "./GroupAnchors";
import { ServiceBookingFlow } from "./ServiceBookingFlow";

/**
 * The auth gate for the configurator only.
 *
 * `/services` is a page visitors arrive at *before* they have an account, so
 * the hero and the service proposition render for everyone (see `page.tsx`).
 * Only the configurator needs a session: it creates a booking, tracks pickup
 * and shows order state in the customer's profile.
 *
 * The wording here is lifted from the product tour (`ServicesTour`) rather than
 * invented — it describes what the visitor actually gets, not a marketing claim.
 */
const WHAT_YOU_GET = [
  "Chọn dịch vụ theo nhóm — số lượng switch, layout bàn phím, mô tả lỗi kèm ảnh.",
  "Chọn thời gian và ghi chú pickup — shipper đến tận nơi nhận bàn phím.",
  "Theo dõi trạng thái đơn ngay trong Hồ sơ.",
];

/**
 * Shaped placeholder that mirrors the flow's own rhythm (steps strip, quick
 * nav, four service groups) so the swap into real content does not shift the
 * page under the visitor's thumb.
 */
function BookingSkeleton() {
  return (
    <section
      className="space-y-4"
      aria-busy="true"
      aria-label="Đang tải dịch vụ"
    >
      <div className="h-11 rounded-full bg-surface-container" />
      <div className="h-9 rounded-full bg-surface-container" />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="h-8 w-24 rounded-full bg-surface-container"
          />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="rounded-2xl bg-surface-container p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-surface-container-high" />
            <div className="h-4 w-32 rounded bg-surface-container-high" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-3 w-40 rounded bg-surface-container-high" />
            <div className="h-3 w-3/4 rounded bg-surface-container-high" />
          </div>
          <div className="mt-4 h-9 w-full rounded-full bg-surface-container-high" />
        </div>
      ))}
    </section>
  );
}

export function ServiceBookingSection({
  sectionKeys = [],
}: {
  /** Group keys from the server-rendered config — the showcase's link targets. */
  sectionKeys?: string[];
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <>
        <GroupAnchors sectionKeys={sectionKeys} />
        <BookingSkeleton />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <GroupAnchors sectionKeys={sectionKeys} />
        <section
          id="tour-booking-gate"
          aria-labelledby="booking-gate-title"
          className="rounded-2xl bg-surface-container p-5 shadow-ambient-sm"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container-highest text-on-surface-variant">
              <LockKeyhole className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2
                id="booking-gate-title"
                className="text-base font-extrabold text-on-surface"
              >
                Đăng nhập để đặt lịch dịch vụ
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
                Đặt lịch cần một tài khoản để lưu đơn và cập nhật trạng thái cho
                bạn.
              </p>
            </div>
          </div>

          <ul className="mt-4 space-y-2.5">
            {WHAT_YOU_GET.map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                <span className="text-sm leading-relaxed text-on-surface-variant">
                  {line}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-5 space-y-2">
            <Link
              href="/login?next=%2Fservices"
              className="btn btn-primary btn-block rounded-full text-xs font-bold uppercase tracking-[0.08em]"
            >
              Đăng nhập
            </Link>
            <Link
              href="/register"
              className="btn btn-ghost btn-block rounded-full text-xs font-bold uppercase tracking-[0.08em] text-on-surface-variant"
            >
              Tạo tài khoản mới
            </Link>
          </div>
        </section>
      </>
    );
  }

  return <ServiceBookingFlow sectionKeys={sectionKeys} />;
}
