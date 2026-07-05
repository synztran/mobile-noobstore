import type { SupportTicketCategory, SupportTicketStatus } from "@/types/support";

export const SUPPORT_CATEGORY_LABEL: Record<SupportTicketCategory, string> = {
  defective: "Sản phẩm bị lỗi",
  wrong_item: "Sai sản phẩm",
  missing_item: "Thiếu sản phẩm",
  shipping: "Vấn đề vận chuyển",
  other: "Khác",
};

export const SUPPORT_STATUS_LABEL: Record<SupportTicketStatus, string> = {
  open: "Đã gửi",
  in_progress: "Đang xử lý",
  resolved: "Đã giải quyết",
  closed: "Đã đóng",
};

export const SUPPORT_STATUS_COLOR: Record<SupportTicketStatus, string> = {
  open: "text-blue-600 bg-blue-50",
  in_progress: "text-amber-600 bg-amber-50",
  resolved: "text-emerald-600 bg-emerald-50",
  closed: "text-gray-500 bg-gray-100",
};

export const SUPPORT_CATEGORY_OPTIONS = [
  { value: "defective" as const, label: "Sản phẩm bị lỗi" },
  { value: "wrong_item" as const, label: "Sai sản phẩm" },
  { value: "missing_item" as const, label: "Thiếu sản phẩm" },
  { value: "shipping" as const, label: "Vấn đề vận chuyển" },
  { value: "other" as const, label: "Khác" },
];
