"use client";

import { OrderItemsList } from "@/components/checkout/OrderItemsList";
import ShippingFeeLabel from "@/components/ui/ShippingFeeLabel";
import Icon from "@/components/ui/Icon";
import { useIsMounted } from "@/hooks/useIsMounted";
import { formatVND } from "@/lib/currency";
import { usePaymentInformation } from "@/lib/react-query/order/api/useOrderQueries";
import { toast } from "@/lib/toast";
import { useCheckoutStore } from "@/store";
import { useQuery } from "@tanstack/react-query";
import Image from "@/components/ui/AdaptiveImage";
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

export default function CheckingPage() {
  const mounted = useIsMounted();
  const router = useRouter();

  const { orderNumber, totalPrice, orderedItems, shippingCost, shipping } =
    useCheckoutStore();

  const isDeliveryService = shipping?.deliverySpeed === "shipment";

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
    // Stop polling once the order reaches a terminal status
    refetchInterval: (query) => {
      const status = query.state.data;
      const terminal = ["confirmed", "cancelled", "failed", "completed"];
      if (status && terminal.includes(status)) return false;
      return 5000;
    },
  });

  const paymentMethodsQuery = usePaymentInformation(mounted);

  const orderStatus = orderStatusQuery.data ?? null;
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
        value: bankMethod?.platform_name ?? "N/a",
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
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-surface-container-lowest p-4 text-center">
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
      <section className="mb-8">
        <div className="group relative flex flex-col items-center overflow-hidden rounded-2xl bg-surface-container-lowest p-4 shadow-ambient">
          {bankMethod ? (
            <div className="relative z-10 mb-2 h-64 w-full rounded-2xl bg-white p-4">
              <Image
                src={buildQRBank(
                  `${orderNumber} - ${orderedItems.length} items`,
                  totalPrice
                )}
                alt="Payment QR Code"
                objectFit="contain"
                fill
                sizes="(max-width: 768px) 90vw, 360px"
                unoptimized
              />
            </div>
          ) : (
            <div className="relative z-10 mb-2 flex h-64 w-full items-center justify-center rounded-2xl bg-surface-container">
              <p className="px-6 text-center text-sm font-semibold text-on-surface-variant">
                Chưa có cấu hình thanh toán ngân hàng.
              </p>
            </div>
          )}
          <p className="relative z-10 mb-1 text-lg font-bold text-on-surface">
            Quét để thanh toán
          </p>
          {/* Amount breakdown */}
          <div className="relative z-10 mt-3 w-full space-y-2 rounded-2xl bg-surface-container p-4">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Tạm tính</span>
              <span className="font-bold text-on-surface">
                {formatVND(subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Phí vận chuyển</span>
              <ShippingFeeLabel
                shippingCost={shippingCost}
                deliveryService={isDeliveryService}
              />
            </div>
            <div className="h-px bg-outline-variant/30" />
            <div className="flex justify-between">
              <span className="font-black text-on-surface">Tổng cộng</span>
              <span className="text-lg font-black text-primary">
                {formatVND(totalPrice)}
              </span>
            </div>
          </div>
          <p className="relative z-10 mt-2 text-center text-xs leading-relaxed text-on-surface-variant">
            Mở app banking và quét mã để hoàn tất thanh toán.
          </p>
        </div>
      </section>

      {/* Bank Transfer */}
      <section className="mb-8">
        <div className="flex flex-wrap gap-3 rounded-2xl bg-surface-container-low p-4">
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
                  onClick={() => copyToClipboard(value, label)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container transition-transform hover:bg-surface-container-high active:scale-90"
                >
                  <Icon name="content_copy" className="text-xl text-primary" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Notice */}
      <div className="mb-8 flex gap-2 rounded-2xl border border-primary-fixed/30 bg-primary-fixed/20 p-4">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-primary-container text-white">
          <Icon name="info" className="icon-filled text-sm text-white" />
        </div>
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
    </div>
  );
}
