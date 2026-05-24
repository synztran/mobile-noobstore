"use client";

import { formatVND } from "@/lib/currency";
import type { PaymentInformation } from "@/lib/payment-information";
import { buildQRBank } from "@/lib/qr-bank";
import Image from "next/image";
import { useState } from "react";

interface Props {
	bankMethod: PaymentInformation | null;
	totalPrice: number;
	orderNumber: string | null;
	subtotal: number;
	shippingCost: number;
	voucherDiscount?: number;
	shippingDiscount?: number;
	totalLabel?: string;
}

export function QRPaymentSection({
	bankMethod,
	totalPrice,
	orderNumber,
	subtotal,
	shippingCost,
	voucherDiscount = 0,
	shippingDiscount = 0,
	totalLabel = "Tổng cộng",
}: Props) {
	const [qrError, setQrError] = useState(false);

	return (
		<div className="bg-surface-container-low rounded-2xl flex flex-col items-center shadow-ambient relative overflow-hidden">
			{bankMethod ? (
				<div className="bg-white p-4 rounded-2xl mb-2 relative z-10 w-full h-64 border border-outline-variant/30 flex items-center justify-center">
					{qrError ? (
						<p className="text-sm text-on-surface-variant text-center px-4 leading-relaxed">
							Nếu QR không khả dụng, vui lòng thực hiện thao tác
							chuyển khoản theo thông tin đề cập bên dưới
						</p>
					) : (
						<Image
							src={buildQRBank(
								bankMethod,
								totalPrice,
								`${orderNumber}`,
							)}
							alt="Payment QR Code"
							className="object-contain"
							fill
							unoptimized
							onError={() => setQrError(true)}
						/>
					)}
				</div>
			) : (
				<div className="bg-surface-container rounded-2xl mb-2 relative z-10 w-full h-64 flex items-center justify-center">
					<p className="text-sm font-semibold text-on-surface-variant text-center px-6">
						Chưa có cấu hình thanh toán ngân hàng.
					</p>
				</div>
			)}
			<p className="text-on-surface-variant text-xs leading-relaxed text-center relative z-10">
				Mở app banking và quét mã để hoàn tất thanh toán.
			</p>

			{/* Amount breakdown */}
			<div className="w-full bg-surface-container-high rounded-2xl p-4 mt-3 relative z-10 space-y-2">
				<div className="flex justify-between text-sm">
					<span className="text-on-surface-variant">Tạm tính</span>
					<span className="font-bold text-on-surface">
						{formatVND(subtotal)}
					</span>
				</div>
				<div className="flex justify-between text-sm">
					<span className="text-on-surface-variant">
						Phí vận chuyển
					</span>
					<span
						className={
							shippingCost === 0
								? "font-bold text-secondary"
								: "font-bold text-on-surface"
						}>
						{shippingCost === 0
							? "Miễn phí"
							: formatVND(shippingCost)}
					</span>
				</div>
				{voucherDiscount > 0 && (
					<div className="flex justify-between text-sm">
						<span className="text-on-surface-variant">
							Giảm giá voucher
						</span>
						<span className="font-bold text-secondary">
							-{formatVND(voucherDiscount)}
						</span>
					</div>
				)}
				{shippingDiscount > 0 && (
					<div className="flex justify-between text-sm">
						<span className="text-on-surface-variant">
							Giảm phí vận chuyển
						</span>
						<span className="font-bold text-secondary">
							-{formatVND(shippingDiscount)}
						</span>
					</div>
				)}
				<div className="h-px bg-outline-variant/30" />
				<div className="flex justify-between">
					<span className="font-black text-on-surface">
						{totalLabel}
					</span>
					<span className="font-black text-primary text-lg">
						{formatVND(totalPrice)}
					</span>
				</div>
			</div>
		</div>
	);
}
