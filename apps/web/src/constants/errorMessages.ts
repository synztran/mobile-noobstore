export const VOUCHER_ERROR_MESSAGES = {
  FETCH_VOUCHERS_FAILED: "Lỗi! Không thể tải danh sách voucher",
  APPLY_VOUCHER_FAILED: "Lỗi! Không thể áp dụng voucher",
  INVALID_VOUCHER: "Voucher không hợp lệ hoặc không thể áp dụng",
  VOUCHER_ID_IS_REQUIRED: "Mã voucher là bắt buộc",
  VOUCHER_NOT_FOUND: "Voucher không tồn tại",
  ALREADY_APPLIED: "Voucher đã được áp dụng",
  ALREADY_USED: "Voucher đã được sử dụng",
  VOUCHER_LIMIT_EXCEEDED: "Voucher đã đạt giới hạn sử dụng",
  MAX_VOUCHERS_PER_ORDER: (max: number) =>
    `Chỉ được áp dụng tối đa ${max} mã giảm giá. Vui lòng gỡ bỏ một mã đã áp dụng rồi thử lại.`,
  OUT_OF_RANGE: "Voucher không còn hiệu lực",
  // Courier tiers are quoted after checkout, so their shipping fee is 0 until
  // staff set it. A shipping voucher would resolve to 0đ saving there.
  SHIPPING_FEE_NOT_QUOTED: (code: string) =>
    `Voucher "${code}": Phí vận chuyển của phương thức này được báo sau khi đặt hàng, nên voucher giảm phí vận chuyển không áp dụng được.`,
};
