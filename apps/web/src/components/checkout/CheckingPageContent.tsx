"use client";

import { OrderItemsList } from "@/components/checkout/OrderItemsList";
import { Copy } from "lucide-react";
import { useIsMounted } from "@/hooks/useIsMounted";
import { cartItemsToGA, trackPurchase } from "@/lib/analytics";
import type { PaymentInformation } from "@/lib/payment-information";
import {
  useOrderStatus,
  usePaymentInformation,
} from "@/lib/react-query/order/api/useOrderQueries";
import { toast } from "@/lib/toast";
import { isFeePendingShippingMethod } from "@/lib/shipping-method";
import { useCheckoutStore } from "@/store";
import { formatVND } from "@/lib/currency";
import Image from "@/components/ui/AdaptiveImage";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { QRPaymentSection } from "./QRPaymentSection";
import { NOT_FOUND_IMAGE } from "@/lib/images";

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

  const { orderNumber, totalPrice, orderedItems, shippingCost, shipping } =
    useCheckoutStore();

  const shippingFeePending = isFeePendingShippingMethod(
    shipping?.shippingMethodId ?? shipping?.deliverySpeed
  );

  // Guard: redirect to shop if there is no active order
  useEffect(() => {
    if (mounted && !orderNumber) {
      toast.error("Không tìm thấy đơn hàng. Vui lòng thử lại.");
      router.replace("/shop");
    }
  }, [mounted, orderNumber, router]);

  // Fire GA4 purchase once per order (guarded via sessionStorage)
  useEffect(() => {
    if (!mounted || !orderNumber || orderedItems.length === 0) return;
    const key = `ga_purchase_${orderNumber}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    trackPurchase(orderNumber, cartItemsToGA(orderedItems), totalPrice);
  }, [mounted, orderNumber, orderedItems, totalPrice]);

  const orderStatusQuery = useOrderStatus(
    orderNumber,
    mounted && !!orderNumber,
    5000
  );

  const paymentMethodsQuery = usePaymentInformation(mounted);

  const orderStatus = orderStatusQuery.data?.status ?? null;
  const orderNotFound = orderStatusQuery.data?.notFound ?? false;

  // Ownership guard: order belongs to a different account — redirect to login
  const notFoundRedirected = useRef(false);
  useEffect(() => {
    if (!mounted || !orderNotFound || notFoundRedirected.current) return;
    notFoundRedirected.current = true;
    toast.error(
      "Đơn hàng không thuộc tài khoản này. Vui lòng đăng nhập đúng tài khoản."
    );
    router.replace("/login");
  }, [mounted, orderNotFound, router]);
  const orderVoucherDiscount =
    orderStatusQuery.data?.voucher_discount_amount ?? 0;
  const orderShippingDiscount =
    orderStatusQuery.data?.shipping_discount_amount ?? 0;
  const orderPaymentType = orderStatusQuery.data?.payment_type ?? "full";
  const orderDepositAmount = orderStatusQuery.data?.deposit_amount ?? 0;
  const orderRemainingAmount = orderStatusQuery.data?.remaining_amount ?? 0;
  const orderDepositPercentage = orderStatusQuery.data?.deposit_percentage ?? 0;
  const qrTotal =
    orderPaymentType === "deposit_cod" ? orderDepositAmount : totalPrice;
  const paymentMethods = paymentMethodsQuery.data ?? [];

  // Calculate subtotal from ordered items
  const subtotal = useMemo(() => {
    return orderedItems.reduce((sum, i) => {
      const componentsTotal = (i.components ?? []).reduce(
        (s, c) => s + c.price_adjustment,
        0
      );
      return sum + (i.product.base_price + componentsTotal) * i.quantity;
    }, 0);
  }, [orderedItems]);

  const bankMethod = useMemo(
    () =>
      paymentMethods.find((method) => method.platform_type === "bank") ?? null,
    [paymentMethods]
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
    [bankMethod, orderNumber]
  );

  useEffect(() => {
    if (paymentMethodsQuery.isError) {
      toast.error("Không thể tải thông tin thanh toán");
    }
  }, [paymentMethodsQuery.isError]);

  if (!mounted) {
    return (
      <div className="animate-pulse space-y-5">
        <div className="h-32 rounded-3xl bg-surface-container" />
        <div className="h-48 rounded-3xl bg-surface-container" />
        <div className="h-14 rounded-full bg-surface-container" />
      </div>
    );
  }

  // Ownership guard: prevent rendering bank/QR info while redirecting
  if (orderNotFound) {
    return null;
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
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-surface-container-low p-4 text-center">
          {/* Animated status badge */}
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <div className="absolute h-16 w-16 animate-ping rounded-full bg-primary/10" />
              <span className="loading loading-spinner relative z-10 text-accent"></span>
            </div>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.25em] text-primary">
              Trạng thái đơn hàng
            </p>
            <h2 className="text-xl font-black tracking-tight text-on-surface">
              {orderStatus}
            </h2>
          </div>
          {orderNumber && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Mã đơn hàng
              </p>
              <p className="text-lg font-black tracking-widest text-primary">
                {orderNumber}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* QR Scan Section */}
      <section className="mb-8 space-y-4">
        {orderPaymentType === "deposit_cod" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-100 p-3">
            <p className="text-xs font-bold text-amber-800">
              Thanh toán đặt cọc
            </p>
            <p className="text-xs leading-relaxed text-amber-700">
              Đơn hàng đặt cọc {orderDepositPercentage}% (
              {formatVND(orderDepositAmount)}). Vui lòng chuyển khoản đủ số tiền
              đặt cọc. Số còn lại ({formatVND(orderRemainingAmount)}) sẽ thanh
              toán khi nhận hàng.
            </p>
          </div>
        )}
        <QRPaymentSection
          bankMethod={bankMethod}
          totalPrice={qrTotal}
          orderNumber={orderNumber}
          subtotal={subtotal}
          shippingCost={shippingCost}
          voucherDiscount={orderVoucherDiscount}
          shippingDiscount={orderShippingDiscount}
          paymentType={orderPaymentType}
          depositAmount={orderDepositAmount}
          remainingAmount={orderRemainingAmount}
          depositPercentage={orderDepositPercentage}
          shippingFeePending={shippingFeePending}
        />
      </section>

      {/* Bank Transfer */}
      <section className="mb-8">
        <div className="flex flex-wrap gap-3 rounded-2xl bg-surface-container p-4">
          {bankInfoRows.map(({ id, label, value, copyable }) => (
            // Keep account number and account name on the same row.
            // Other fields remain full-width rows.
            <div
              key={id ?? label}
              className={`flex items-center justify-between rounded-xl ${id === "bank_account_number" || id === "bank_account_name" ? "w-[calc(50%-0.375rem)]" : "w-full"}`}
            >
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-outline">
                  {label}
                </p>
                <div className="flex items-center gap-2 text-base font-bold text-on-surface">
                  {id === "bank_name" ? (
                    <Image
                      src={bankMethod?.bank_logo_url ?? NOT_FOUND_IMAGE}
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
                  onClick={() => copyToClipboard(value, label)}
                  className="flex h-4 w-4 items-center justify-center rounded-full bg-surface-container transition-transform hover:bg-surface-container-high active:scale-90"
                >
                  <Copy className="h-5 w-5 text-primary" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Notice */}
      <div className="mb-8 flex gap-2 rounded-2xl border border-primary-fixed bg-primary-fixed/20 p-4">
        <p className="text-sm leading-relaxed text-on-primary-fixed-variant">
          <span className="font-bold">Lưu ý:</span> Vui lòng kiểm tra <br />
          Mã đơn hàng{" "}
          <span className="font-extrabold underline decoration-primary decoration-2">
            {orderNumber}
          </span>{" "}
          trong nội dung chuyển khoản để xác nhận nhanh hơn.
        </p>
      </div>

      <OrderItemsList items={orderedItems} />

      {/* ── Actions ─────────────────────────────────────────── */}
      <div className="flex gap-2">
        <button
          onClick={() =>
            router.push(`/profile/orders?orderNumber=${orderNumber}`)
          }
          className="primary-gradient flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 text-xs font-black uppercase tracking-widest text-white transition-transform active:scale-[0.98]"
        >
          Theo dõi đơn hàng
        </button>
        <button
          onClick={() => router.push("/shop")}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-transparent py-4 text-xs font-black uppercase tracking-widest text-primary transition-transform active:scale-[0.98]"
        >
          Mua sắm tiếp
        </button>
      </div>
    </div>
  );
}
