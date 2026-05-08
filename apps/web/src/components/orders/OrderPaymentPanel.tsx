"use client";

import type { PaymentInformationResponse } from "@/app/api/payment-information/route";
import { formatVND } from "@/lib/currency";
import type { PaymentInformation } from "@/lib/payment-information";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy } from "lucide-react";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";

interface Props {
	orderNumber: string;
	totalPrice: number;
	shippingFee: number;
	voucherDiscount?: number;
	shippingDiscount?: number;
}

function buildQRUrl(
	bank: PaymentInformation,
	amount: number,
	ref: string,
): string {
	const query = new URLSearchParams({
		acc: bank.account_number,
		bank: bank.platform_name,
		amount: String(amount),
		des: ref,
		template: "compact",
	});
	return `https://qr.sepay.vn/img?${query.toString()}`;
}

function CopyButton({ value, label }: { value: string; label: string }) {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(() => {
		navigator.clipboard.writeText(value).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	}, [value]);

	return (
		<button
			type="button"
			aria-label={`Sao chép ${label}`}
			onClick={handleCopy}
			className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center active:scale-90 transition-transform">
			{copied ? (
				<Check size={14} className="text-secondary" />
			) : (
				<Copy size={14} className="text-primary" />
			)}
		</button>
	);
}

export function OrderPaymentPanel({
	orderNumber,
	totalPrice,
	shippingFee,
	voucherDiscount = 0,
	shippingDiscount = 0,
}: Props) {
	const subtotal =
		totalPrice - shippingFee + voucherDiscount + shippingDiscount;

	const { data, isLoading } = useQuery<PaymentInformationResponse>({
		queryKey: ["payment-information"],
		queryFn: async () => {
			const res = await fetch("/api/payment-information");
			if (!res.ok) throw new Error("Failed to load payment info");
			return res.json();
		},
		staleTime: 5 * 60 * 1000,
	});

	const bankMethod = useMemo(
		() => data?.methods?.find((m) => m.platform_type === "bank") ?? null,
		[data],
	);

	const qrUrl = useMemo(() => {
		if (!bankMethod) return null;
		return buildQRUrl(bankMethod, totalPrice, orderNumber);
	}, [bankMethod, totalPrice, orderNumber]);

	if (isLoading) {
		return (
			<div className="animate-pulse space-y-3">
				<div className="h-4 w-40 bg-surface-container rounded-full" />
				<div className="h-56 bg-surface-container rounded-2xl" />
				<div className="h-24 bg-surface-container rounded-2xl" />
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Section label */}
			<p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
				Thanh toán đơn hàng
			</p>

			{/* QR Code */}
			<div className="bg-surface-container rounded-2xl p-4 flex flex-col items-center gap-3">
				{qrUrl ? (
					<div className="relative w-full h-56 bg-white rounded-xl overflow-hidden border border-outline-variant/20">
						<Image
							src={qrUrl}
							alt={`Mã QR thanh toán đơn ${orderNumber}`}
							fill
							className="object-contain"
							unoptimized
						/>
					</div>
				) : (
					<div className="w-full h-56 bg-surface rounded-xl border border-outline-variant/20 flex items-center justify-center">
						<p className="text-sm text-on-surface-variant text-center px-6">
							Chưa cấu hình thông tin ngân hàng
						</p>
					</div>
				)}
				<div>
					<p className="text-sm font-bold text-on-surface text-center">
						Quét mã để thanh toán
					</p>
					<p className="text-xs text-on-surface-variant text-center">
						Mở app ngân hàng và quét mã để hoàn tất thanh toán
					</p>
				</div>
			</div>

			{/* Amount breakdown */}
			<div className="bg-surface-container rounded-2xl px-4 py-3 space-y-2">
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
							shippingFee === 0
								? "font-bold text-secondary"
								: "font-bold text-on-surface"
						}>
						{shippingFee === 0
							? "Miễn phí"
							: formatVND(shippingFee)}
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
						Cần thanh toán
					</span>
					<span className="font-black text-primary text-base">
						{formatVND(totalPrice)}
					</span>
				</div>
			</div>

			{/* Bank info rows */}
			{bankMethod && (
				<div className="bg-surface-container rounded-2xl px-4 py-3 space-y-3">
					<div className="space-y-2">
						{/* Bank name */}
						<div className="flex items-center justify-between">
							<div className="flex-1 flex flex-col bg-surface rounded-xl px-3 py-2">
								<p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-0.5">
									Ngân hàng
								</p>
								<p className="font-bold text-on-surface text-sm uppercase">
									{bankMethod.platform_name}
								</p>
							</div>
						</div>

						{/* Account number + account name side by side */}
						<div className="flex gap-2">
							<div className="flex-1 flex items-center justify-between bg-surface rounded-xl px-3 py-2">
								<div>
									<p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-0.5">
										Số tài khoản
									</p>
									<p className="font-black text-on-surface text-sm tracking-wider">
										{bankMethod.account_number}
									</p>
								</div>
								<CopyButton
									value={bankMethod.account_number}
									label="số tài khoản"
								/>
							</div>
						</div>

						<div className="flex gap-2">
							<div className="flex-1 flex items-center justify-between bg-surface rounded-xl px-3 py-2">
								<div>
									<p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-0.5">
										Chủ tài khoản
									</p>
									<p className="font-black text-on-surface text-sm">
										{bankMethod.account_name}
									</p>
								</div>
								<CopyButton
									value={bankMethod.account_name}
									label="chủ tài khoản"
								/>
							</div>
						</div>

						{/* Transfer content */}
						<div className="flex items-center justify-between bg-surface rounded-xl px-3 py-2">
							<div>
								<p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-0.5">
									Nội dung chuyển khoản
								</p>
								<p className="font-black text-primary text-sm tracking-wider">
									{orderNumber}
								</p>
							</div>
							<CopyButton
								value={orderNumber}
								label="nội dung chuyển khoản"
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
