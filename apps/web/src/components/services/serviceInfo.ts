import { CalendarClock, RotateCcw, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Service-page copy that renders in more than one place.
 *
 * The landing page shows this publicly: a visitor deciding whether to hand
 * over an expensive keyboard needs the process, the guarantees and the FAQ
 * *before* being asked to sign in. The booking flow used to own this copy
 * privately and render it at the end of the flow, so nobody signed out ever
 * saw it. Both surfaces now read from here, so they cannot drift apart.
 *
 * Data and icon references only — no JSX — so this stays importable from
 * server and client components alike.
 */

export interface ServiceFaqItem {
  q: string;
  a: string;
}

export const SERVICE_FAQS: ServiceFaqItem[] = [
  {
    q: "Mình cần chuẩn bị gì khi lấy hàng?",
    a: "Chỉ cần vệ sinh nhẹ bàn phím trước khi gửi. Chúng tôi sẽ ghé theo giờ hẹn đã chọn, kiểm tra cùng bạn rồi mang đi xử lý.",
  },
  {
    q: "Giá hiển thị đã bao gồm gì?",
    a: "Giá từng mục là giá dịch vụ cơ bản. Các tuỳ chọn nâng cao (thay switch, loại grease…) sẽ được cộng thêm vào khi bạn chọn, và luôn hiển thị trước khi đặt lịch.",
  },
  {
    q: "Thời gian xử lý tính như thế nào?",
    a: "Mỗi mục có số ngày xử lý riêng. Nếu đặt nhiều mục trong một đơn, tổng thời gian sẽ là tổng số ngày của tất cả mục.",
  },
  {
    q: "Sau khi đặt lịch thì sao?",
    a: "Bạn sẽ nhận mã đơn ngay lập tức. Noobstore sẽ liên hệ để xác nhận chi tiết, lịch hẹn và tiến hành xử lý đơn của bạn.",
  },
];

export interface ServiceTimelineStep {
  title: string;
  desc: string;
}

export const SERVICE_TIMELINE: ServiceTimelineStep[] = [
  { title: "Tiếp nhận", desc: "Kiểm tra bàn phím cùng bạn tại giờ hẹn" },
  {
    title: "Xử lý & báo giá",
    desc: "Xử lý theo đơn, báo giá phần phát sinh (nếu có)",
  },
  { title: "Hoàn tất & trả máy", desc: "Test chạy, đóng gói và trao trả đúng hẹn" },
];

export interface ServiceGuarantee {
  icon: LucideIcon;
  label: string;
}

export const SERVICE_GUARANTEES: ServiceGuarantee[] = [
  { icon: ShieldCheck, label: "Bảo hành dịch vụ" },
  { icon: CalendarClock, label: "Đúng hẹn" },
  { icon: RotateCcw, label: "Hỗ trợ sau dịch vụ" },
];
