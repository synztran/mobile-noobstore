"use client";

import { OrderItemsList } from "@/components/checkout/OrderItemsList";
import Icon from "@/components/ui/Icon";
import { useIsMounted } from "@/hooks/useIsMounted";
import { formatVND } from "@/lib/currency";
import { toast } from "@/lib/toast";
import { useCheckoutStore } from "@/store";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const BANK_INFO = [
	{
		label: "Ngân hàng",
		value: "",
		icon: "/logo/vietinbank_logo.png",
		id: "bank_name",
	},
	{
		id: "bank_account_number",
		label: "Số tài khoản",
		value: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER ?? "N/a",
	},
	{
		id: "bank_account_name",
		label: "Chủ tài khoản",
		value: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME ?? "N/a",
	},
	{ id: "payment_content", label: "Nội dung", value: "{t}" },
];

function copyToClipboard(value: string, label: string) {
	navigator.clipboard.writeText(value).then(() => {
		toast.success(`${label} đã sao chép!`);
	});
}

export default function CheckingPage() {
	const mounted = useIsMounted();
	const params = useParams();
	// const orderId = params.id as string;
	const [orderStatus, setOrderStatus] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const { orderNumber, totalPrice, orderedItems, shippingCost } =
		useCheckoutStore();

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

	// Fetch order status
	useEffect(() => {
		if (!orderNumber || !mounted) return;

		const fetchOrderStatus = async () => {
			try {
				const res = await fetch(`/api/orders/${orderNumber}`, {
					method: "GET",
				});
				if (!res.ok) {
					setOrderStatus("");
					return;
				}
				const data = await res.json();
				setOrderStatus(data.status);
			} catch {
				setOrderStatus("pending");
			} finally {
				setIsLoading(false);
			}
		};

		// Initial fetch
		fetchOrderStatus();

		// Poll every 5 seconds
		const interval = setInterval(fetchOrderStatus, 5000);

		return () => clearInterval(interval);
	}, [orderNumber, mounted]);

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
		return `https://qr.sepay.vn/img?acc=${process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER}&bank=${process.env.NEXT_PUBLIC_BANK_NAME}&amount=${paymentPrice}&des=${message}&template=compact`;
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
					{BANK_INFO.map(({ id, label, value }) => (
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
									{id === "payment_content"
										? value.replace(
												"{t}",
												orderNumber ?? "",
											)
										: value}
								</div>
							</div>
							<button
								onClick={() => copyToClipboard(value, label)}
								className={`w-8 h-8 rounded-full bg-surface-container flex items-center justify-center active:scale-90 transition-transform hover:bg-surface-container-high ${id === "bank_name" ? "sr-only" : ""} `}>
								<Icon
									name="content_copy"
									className="text-primary text-xl"
								/>
							</button>
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
