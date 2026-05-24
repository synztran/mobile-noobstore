"use client";

import { OrderItemsList } from "@/components/checkout/OrderItemsList";
import Icon from "@/components/ui/Icon";
import { useIsMounted } from "@/hooks/useIsMounted";
import type { PaymentInformation } from "@/lib/payment-information";
import {
	useOrderStatus,
	usePaymentInformation,
} from "@/lib/react-query/order/api/useOrderQueries";
import { toast } from "@/lib/toast";
import { useCheckoutStore } from "@/store";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { QRPaymentSection } from "./QRPaymentSection";

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

	const orderStatusQuery = useOrderStatus(
		orderNumber,
		mounted && !!orderNumber,
		5000,
	);

	const paymentMethodsQuery = usePaymentInformation(mounted);

	const orderStatus = orderStatusQuery.data?.status ?? null;
	const orderVoucherDiscount =
		orderStatusQuery.data?.voucher_discount_amount ?? 0;
	const orderShippingDiscount =
		orderStatusQuery.data?.shipping_discount_amount ?? 0;
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
				<div className="bg-surface-container-low rounded-2xl p-4 flex flex-col items-center text-center gap-4">
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
				<QRPaymentSection
					bankMethod={bankMethod}
					totalPrice={totalPrice}
					orderNumber={orderNumber}
					subtotal={subtotal}
					shippingCost={shippingCost}
					voucherDiscount={orderVoucherDiscount}
					shippingDiscount={orderShippingDiscount}
				/>
			</section>

			{/* Bank Transfer */}
			<section className="mb-8">
				<div className="bg-surface-container rounded-2xl p-4 flex flex-wrap gap-3">
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
											src={
												bankMethod?.bank_logo_url ?? ""
											}
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
			<div className="bg-primary-fixed/12 rounded-2xl p-4 mb-8 flex gap-2 border border-primary-fixed/20">
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
