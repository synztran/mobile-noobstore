"use client";

import { OrderItemsList } from "@/components/checkout/OrderItemsList";
import Icon from "@/components/ui/Icon";
import { useIsMounted } from "@/hooks/useIsMounted";
import { formatVND } from "@/lib/currency";
import type { PaymentInformation } from "@/lib/payment-information";
import { toast } from "@/lib/toast";
import { useCheckoutStore } from "@/store";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

type BankInfoRow = {
	id: string;
	label: string;
	value: string;
	copyable?: boolean;
};

function copyToClipboard(value: string, label: string) {
	navigator.clipboard.writeText(value).then(() => {
		toast.success(`${label} đã sao chép!`);
	});
}

export default function CheckingPageContent() {
	const mounted = useIsMounted();
	const router = useRouter();

	const { orderNumber, totalPrice, orderedItems, shippingCost } =
		useCheckoutStore();

	// Guard: redirect to shop if there is no active order
	useEffect(() => {
		if (mounted && !orderNumber) {
			toast.error("Không tìm thấy đơn hàng. Vui lòng thử lại.");
			router.replace("/shop");
		}
	}, [mounted, orderNumber, router]);

	const orderStatusQuery = useQuery({
		queryKey: ["order-status", orderNumber],
		enabled: mounted && !!orderNumber,
		queryFn: async () => {
			const res = await fetch(`/api/orders/${orderNumber}`, {
				method: "GET",
			});
			if (!res.ok) return "";
			const data = await res.json();
			return (data.status as string) ?? "pending";
		},
		refetchInterval: 5000,
	});

	const paymentMethodsQuery = useQuery({
		queryKey: ["payment-information"],
		enabled: mounted,
		queryFn: async () => {
			const res = await fetch("/api/payment-information");
			if (!res.ok) throw new Error("Failed to load payment info");
			const data = (await res.json()) as {
				methods?: PaymentInformation[];
			};
			return data.methods ?? [];
		},
	});

	const orderStatus = orderStatusQuery.data ?? null;
	const paymentMethods = paymentMethodsQuery.data ?? [];

	// Calculate subtotal from ordered items
	const subtotal = useMemo(() => {
		return orderedItems.reduce((sum, i) => {
			const componentsTotal = (i.components ?? []).reduce(
				(s, c) => s + c.price_adjustment,
				0,
			);
			return sum + (i.product.base_price + componentsTotal) * i.quantity;
		}, 0);
	}, [orderedItems]);

	const bankMethod = useMemo(
		() =>
			paymentMethods.find((method) => method.platform_type === "bank") ??
			null,
		[paymentMethods],
	);

	const bankInfoRows = useMemo<BankInfoRow[]>(
		() => [
			{
				id: "bank_name",
				label: "Ngân hàng",
				value: "",
				copyable: false,
			},
			{
				id: "bank_account_number",
				label: "Số tài khoản",
				value: bankMethod?.account_number ?? "N/a",
			},
			{
				id: "bank_account_name",
				label: "Chủ tài khoản",
				value: bankMethod?.account_name ?? "N/a",
			},
			{
				id: "payment_content",
				label: "Nội dung",
				value: orderNumber ?? "",
			},
		],
		[bankMethod, orderNumber],
	);

	useEffect(() => {
		if (paymentMethodsQuery.isError) {
			toast.error("Không thể tải thông tin thanh toán");
		}
	}, [paymentMethodsQuery.isError]);

	if (!mounted) {
		return (
			<div className="animate-pulse space-y-5">
				<div className="h-32 bg-surface-container rounded-3xl" />
				<div className="h-48 bg-surface-container rounded-3xl" />
				<div className="h-14 bg-surface-container rounded-full" />
			</div>
		);
	}

	const buildQRBank = (message: string, paymentPrice: number) => {
		if (!bankMethod) return "";

		const query = new URLSearchParams({
			acc: bankMethod.account_number,
			bank: bankMethod.platform_name,
			amount: String(paymentPrice),
			des: message,
			template: "compact",
		});

		return `https://qr.sepay.vn/img?${query.toString()}`;
	};

	return (
		<div className="space-y-4">
			{/* ── Order Status ───────────────────────────────────── */}
			<section className="">
				<div className="bg-surface-container-lowest rounded-2xl p-4 flex flex-col items-center text-center gap-4">
					{/* Animated status badge */}
					<div className="relative">
						<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
							<div className="w-16 h-16 rounded-full bg-primary/10 absolute animate-ping" />
							<span className="loading loading-spinner text-accent relative z-10"></span>
						</div>
					</div>
					<div>
						<p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-1">
							Trạng thái đơn hàng
						</p>
						<h2 className="text-xl font-black text-on-surface tracking-tight">
							{orderStatus}
						</h2>
					</div>
					{orderNumber && (
						<div className="bg-primary/5 border border-primary/20 rounded-2xl px-5 py-2">
							<p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">
								Mã đơn hàng
							</p>
							<p className="text-lg font-black text-primary tracking-widest">
								{orderNumber}
							</p>
						</div>
					)}
				</div>
			</section>

			{/* QR Scan Section */}
			<section className="mb-8">
				<div className="bg-surface-container-lowest rounded-2xl p-4 flex flex-col items-center shadow-ambient relative overflow-hidden group">
					{bankMethod ? (
						<div className="bg-white p-4 rounded-2xl mb-2 relative z-10 w-full h-64">
							<Image
								src={buildQRBank(
									`${orderNumber} - ${orderedItems.length} items`,
									totalPrice,
								)}
								alt="Payment QR Code"
								objectFit="contain"
								fill
								unoptimized
							/>
						</div>
					) : (
						<div className="bg-surface-container rounded-2xl mb-2 relative z-10 w-full h-64 flex items-center justify-center">
							<p className="text-sm font-semibold text-on-surface-variant text-center px-6">
								Chưa có cấu hình thanh toán ngân hàng.
							</p>
						</div>
					)}
					<p className="text-on-surface font-bold text-lg mb-1 relative z-10">
						Quét để thanh toán
					</p>
					{/* Amount breakdown */}
					<div className="w-full bg-surface-container rounded-2xl p-4 mt-3 relative z-10 space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-on-surface-variant">
								Tạm tính
							</span>
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
						<div className="h-px bg-outline-variant/30" />
						<div className="flex justify-between">
							<span className="font-black text-on-surface">
								Tổng cộng
							</span>
							<span className="font-black text-primary text-lg">
								{formatVND(totalPrice)}
							</span>
						</div>
					</div>
					<p className="text-on-surface-variant text-xs leading-relaxed text-center relative z-10 mt-2">
						Mở app banking và quét mã để hoàn tất thanh toán.
					</p>
				</div>
			</section>

			{/* Bank Transfer */}
			<section className="mb-8">
				<div className="bg-surface-container-low rounded-2xl p-4 flex flex-wrap gap-3">
					{bankInfoRows.map(({ id, label, value, copyable }) => (
						// Keep account number and account name on the same row.
						// Other fields remain full-width rows.
						<div
							key={id ?? label}
							className={`flex items-center justify-between rounded-xl ${id === "bank_account_number" || id === "bank_account_name" ? "w-[calc(50%-0.375rem)]" : "w-full"}`}>
							<div>
								<p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1">
									{label}
								</p>
								<div className="text-on-surface font-bold text-base flex items-center gap-2">
									{id === "bank_name" ? (
										<Image
											src={"/logo/vietinbank_logo.png"}
											alt="bank logo"
											width={120}
											height={60}
										/>
									) : null}
									{value}
								</div>
							</div>
							{copyable === false ? null : (
								<button
									onClick={() =>
										copyToClipboard(value, label)
									}
									className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center active:scale-90 transition-transform hover:bg-surface-container-high">
									<Icon
										name="content_copy"
										className="text-primary text-xl"
									/>
								</button>
							)}
						</div>
					))}
				</div>
			</section>

			{/* Notice */}
			<div className="bg-primary-fixed/20 rounded-2xl p-4 mb-8 flex gap-2 border border-primary-fixed/30">
				<div className="bg-primary-container text-white w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center">
					<Icon
						name="info"
						className="icon-filled text-sm text-white"
					/>
				</div>
				<p className="text-on-primary-fixed-variant text-sm leading-relaxed">
					<span className="font-bold">Lưu ý:</span> Vui lòng kiểm tra{" "}
					<br />
					Mã đơn hàng{" "}
					<span className="font-extrabold underline decoration-2 decoration-primary">
						{orderNumber}
					</span>{" "}
					trong nội dung chuyển khoản để xác nhận nhanh hơn.
				</p>
			</div>

			<OrderItemsList items={orderedItems} />
		</div>
	);
}
