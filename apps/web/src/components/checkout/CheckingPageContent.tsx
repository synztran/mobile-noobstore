"use client";

import AdaptiveImage from "@/components/ui/AdaptiveImage";
import { useIsMounted } from "@/hooks/useIsMounted";
import { cartItemsToGA, trackPurchase } from "@/lib/analytics";
import { formatVND } from "@/lib/currency";
import type { CartItem } from "@/lib/data";
import { useOrderDetail, useOrderStatus } from "@/lib/react-query/order/api/useOrderQueries";
import { toast } from "@/lib/toast";
import { OrderPaymentInstructions } from "@/modules/payments/ui/OrderPaymentInstructions";
import { useCheckoutStore } from "@/store";
import {
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  Package,
  Phone,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export default function CheckingPageContent({
  identifier,
}: { identifier?: string } = {}) {
  const mounted = useIsMounted();
  const router = useRouter();

  const {
    orderNumber: storedOrderNumber,
    totalPrice,
    orderedItems,
    shipping,
  } = useCheckoutStore();
  const lookupKey = identifier ?? storedOrderNumber;

  // Guard: redirect to shop if there is no active order
  useEffect(() => {
    if (mounted && !lookupKey) {
      toast.error("Không tìm thấy đơn hàng. Vui lòng thử lại.");
      router.replace("/shop");
    }
  }, [mounted, lookupKey, router]);

  const orderStatusQuery = useOrderStatus(
    lookupKey,
    mounted && !!lookupKey,
    5000
  );

  const orderDetailQuery = useOrderDetail(
    mounted && lookupKey ? lookupKey : null
  );
  const orderDetail = orderDetailQuery.data;

  const orderStatus = orderStatusQuery.data?.status ?? null;
  const orderNotFound = orderStatusQuery.data?.notFound ?? false;

  const orderNumber =
    orderStatusQuery.data?.order_number ||
    storedOrderNumber ||
    (lookupKey && !/^[0-9a-f-]{36}$/i.test(lookupKey) ? lookupKey : "");

  const displayItems = useMemo<CartItem[]>(() => {
    if (orderDetail?.items && orderDetail.items.length > 0) {
      return orderDetail.items.map((item) => ({
        id: item.id,
        product: {
          id: item.product_id ?? item.id,
          name: item.product_name,
          base_price: item.unit_price,
          thumbnail: item.thumbnail,
          slug: "",
          category_id: null,
          stock_quantity: 0,
          created_at: "",
          updated_at: "",
        } as any,
        variant: null,
        quantity: item.quantity,
        is_pre_order: item.isPreOrder,
        components: (item.components ?? []).map((c) => ({
          variant_id: c.variant_id,
          variant_name: c.variant_name,
          component_group: c.component_group,
          price_adjustment: c.price_adjustment,
          thumbnail: c.thumbnail,
          is_pre_order: c.is_pre_order,
        })),
        gifts: (item.gifts ?? []).map((g) => ({
          gift_name: g.gift_name,
          gift_slug: "",
          gift_thumbnail: g.gift_thumbnail,
          quantity: g.quantity,
        })),
      }));
    }
    if (
      orderedItems.length > 0 &&
      (orderNumber === storedOrderNumber || !storedOrderNumber)
    ) {
      return orderedItems;
    }
    return [];
  }, [orderedItems, orderNumber, storedOrderNumber, orderDetail?.items]);

  // Fire GA4 purchase once per order
  useEffect(() => {
    if (
      !mounted ||
      !orderNumber ||
      orderNumber !== storedOrderNumber ||
      displayItems.length === 0
    )
      return;
    const key = `ga_purchase_${orderNumber}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    trackPurchase(
      orderNumber,
      cartItemsToGA(displayItems),
      totalPrice || orderDetail?.total_price || 0
    );
  }, [
    mounted,
    orderNumber,
    storedOrderNumber,
    displayItems,
    totalPrice,
    orderDetail?.total_price,
  ]);

  const paymentIdentifier = orderNumber || lookupKey;

  // Ownership guard
  const notFoundRedirected = useRef(false);
  useEffect(() => {
    if (!mounted || !orderNotFound || notFoundRedirected.current) return;
    notFoundRedirected.current = true;
    toast.error(
      "Đơn hàng không thuộc tài khoản này. Vui lòng đăng nhập đúng tài khoản."
    );
    router.replace("/login");
  }, [mounted, orderNotFound, router]);

  const [copiedOrderNumber, setCopiedOrderNumber] = useState(false);
  const handleCopyOrderNumber = () => {
    if (!orderNumber) return;
    navigator.clipboard.writeText(orderNumber).then(() => {
      setCopiedOrderNumber(true);
      toast.success("Đã sao chép mã đơn hàng!");
      setTimeout(() => setCopiedOrderNumber(false), 2000);
    });
  };

  if (!mounted) {
    return (
      <div className="animate-pulse space-y-5">
        <div className="h-32 rounded-3xl bg-surface-container" />
        <div className="h-48 rounded-3xl bg-surface-container" />
        <div className="h-14 rounded-full bg-surface-container" />
      </div>
    );
  }

  if (orderNotFound) {
    return null;
  }

  // Address and recipient info resolution
  const recipientName =
    orderDetail?.delivery_address?.full_name ||
    shipping?.fullName ||
    "Khách hàng NoobStore";
  const recipientPhone =
    orderDetail?.delivery_address?.phone_number ||
    shipping?.phoneNumber ||
    "";

  const isPickup =
    orderDetail?.shipping_method_id === "pickup" ||
    (!orderDetail?.shipping_method_id &&
      (shipping?.shippingMethodId === "pickup" ||
        shipping?.deliverySpeed === "pickup"));

  const addressList = [
    orderDetail?.delivery_address?.apartment,
    orderDetail?.delivery_address?.street_address,
    orderDetail?.delivery_address?.ward,
    orderDetail?.delivery_address?.district,
    orderDetail?.delivery_address?.city,
  ].filter(Boolean);

  const fallbackAddressList = [
    shipping?.apartment,
    shipping?.streetAddress,
    shipping?.ward,
    shipping?.district,
    shipping?.city,
  ].filter(Boolean);

  const recipientAddress = isPickup
    ? "Nhận trực tiếp tại Showroom NoobStore (123 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP. HCM)"
    : addressList.length > 0
      ? addressList.join(", ")
      : fallbackAddressList.length > 0
        ? fallbackAddressList.join(", ")
        : "Địa chỉ giao hàng đã được xác nhận";

  const resolvedMethod =
    orderDetail?.shipping_method_id || shipping?.shippingMethodId || shipping?.deliverySpeed;

  const shippingMethodName = isPickup
    ? "Nhận tại cửa hàng (Pickup)"
    : resolvedMethod === "express"
      ? "Giao Hỏa tốc"
      : resolvedMethod === "standard"
        ? "Giao tiêu chuẩn"
        : resolvedMethod === "carrier_4h"
          ? "Giao 4 giờ (Courier)"
          : resolvedMethod === "carrier_express"
            ? "Chuyển phát nhanh"
            : resolvedMethod === "delivery_service"
              ? "Giao hàng liên tỉnh"
              : "Giao Hỏa tốc";

  const totalCalculated =
    orderDetail?.total_price || totalPrice || 0;
  const goodsSubtotal = orderDetail?.items?.length
    ? orderDetail.items.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0,
      )
    : orderedItems.reduce(
        (sum, item) => sum + item.product.base_price * item.quantity,
        0,
      );
  const resolvedPaymentType =
    orderDetail?.payment_type ?? orderStatusQuery.data?.payment_type;
  const timelineReady = Boolean(
    resolvedPaymentType || orderStatusQuery.data?.notFound,
  );
  const isDeposit = resolvedPaymentType === "deposit_cod";
  const depositPercent =
    orderDetail?.deposit_percentage ??
    useCheckoutStore.getState().depositPercentage ??
    50;

  const depositAmt =
    orderDetail?.deposit_amount ||
    (isDeposit ? Math.round((totalCalculated * depositPercent) / 100) : null);
  const remainingAmt =
    orderDetail?.remaining_amount ||
    (depositAmt ? Math.max(0, totalCalculated - depositAmt) : 0);
  const isDepositOrder = isDeposit;
  const firstPaymentAt =
    orderStatusQuery.data?.deposit_paid_at ?? orderDetail?.deposit_paid_at;
  const secondPaymentAt = orderStatusQuery.data?.paid_at ?? orderDetail?.paid_at;
  const firstPaymentComplete = Boolean(
    firstPaymentAt ||
      orderStatus === "first_paid" ||
      orderStatus === "second_paid" ||
      orderStatus === "delivering" ||
      orderStatus === "delivered" ||
      orderDetail?.status === "first_paid" ||
      orderDetail?.status === "second_paid" ||
      orderDetail?.status === "delivering" ||
      orderDetail?.status === "delivered",
  );
  const secondPaymentComplete = Boolean(
    secondPaymentAt ||
      orderStatus === "second_paid" ||
      orderStatus === "delivering" ||
      orderStatus === "delivered" ||
      orderDetail?.status === "second_paid" ||
      orderDetail?.status === "delivering" ||
      orderDetail?.status === "delivered",
  );
  const isDelivering =
    orderStatus === "delivering" || orderDetail?.status === "delivering";
  const isDelivered =
    orderStatus === "delivered" || orderDetail?.status === "delivered";

  const formattedDate = orderDetail?.created_at
    ? new Date(orderDetail.created_at).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : new Date().toLocaleDateString("vi-VN");

  return (
    <div className="space-y-6">
      {/* ── 1. Hero Order Success Banner ────────────────────────── */}
      <section className="rounded-2xl border border-outline-variant/20 bg-surface p-5 shadow-ambient-sm md:p-6 lg:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-700 shadow-xs sm:h-14 sm:w-14 dark:text-emerald-400">
              <CheckCircle2 size={32} className="stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-green-900 dark:text-green-900">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Tiếp nhận thành công
                </span>
                <span className="text-xs text-on-surface-variant">
                  {formattedDate}
                </span>
                {orderStatus && (
                  <span className="rounded-md bg-surface-container px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">
                    {orderStatus}
                  </span>
                )}
              </div>
              <h1 className="text-lg font-black tracking-tight text-on-surface sm:text-2xl">
                Đặt hàng thành công! Mã đơn:{" "}
                <span className="text-primary font-mono">#{orderNumber}</span>
              </h1>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Hệ thống đã ghi nhận đơn hàng. Vui lòng quét mã QR thanh toán bên dưới để tự động hoàn tất trong <strong>10–30 giây</strong>.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:self-center">
            <button
              type="button"
              onClick={handleCopyOrderNumber}
              aria-label="Sao chép mã đơn"
              title="Sao chép mã đơn"
              className="btn btn-outline btn-sm h-9 w-9 p-0 rounded-xl border-outline-variant/40 transition-all active:scale-95"
            >
              {copiedOrderNumber ? (
                <Check size={16} className="text-emerald-600" />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>
        </div>
      </section>

      {/* ── 2. Main 2-Column Grid (Desktop) ────────────────────────── */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-8">
        {/* Left Column: QRBanking Payment & Processing Timeline */}
        <div className="space-y-6">
          {paymentIdentifier && (
            <OrderPaymentInstructions identifier={paymentIdentifier} />
          )}

          {/* Order processing timeline */}
          <section className="rounded-2xl border border-outline-variant/20 bg-surface p-5 shadow-ambient-sm md:p-6">
            <h3 className="mb-4 text-sm font-black text-on-surface">
              Tiến trình xử lý đơn hàng
            </h3>
            {!timelineReady ? (
              <div className="grid grid-cols-5 gap-3" aria-label="Đang tải tiến trình đơn hàng">
                {Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className="space-y-2">
                    <div className="h-7 w-7 animate-pulse rounded-full bg-surface-container" />
                    <div className="h-3 w-4/5 animate-pulse rounded bg-surface-container" />
                    <div className="h-3 w-3/5 animate-pulse rounded bg-surface-container" />
                  </div>
                ))}
              </div>
            ) : isDepositOrder ? (
              <div className="overflow-x-auto pb-2">
              <ol className="grid min-w-[620px] grid-cols-5 gap-2">
                {[
                  {
                    key: "placed",
                    label: "Đặt hàng",
                    detail: "Đã tiếp nhận",
                    complete: true,
                    active: false,
                    icon: <Check size={14} strokeWidth={3} />,
                  },
                  {
                    key: "first-payment",
                    label: "Thanh toán lần 1",
                    detail: firstPaymentComplete
                      ? `Đã nhận ${formatVND(depositAmt ?? 0)}`
                      : `Chờ ${formatVND(depositAmt ?? 0)}`,
                    complete: firstPaymentComplete,
                    active: !firstPaymentComplete,
                    icon: firstPaymentComplete ? <Check size={14} strokeWidth={3} /> : "1",
                  },
                  {
                    key: "second-payment",
                    label: "Thanh toán lần 2",
                    detail: secondPaymentComplete
                      ? "Đã thanh toán đủ"
                      : `Còn ${formatVND(remainingAmt)}`,
                    complete: secondPaymentComplete,
                    active: firstPaymentComplete && !secondPaymentComplete,
                    icon: secondPaymentComplete ? <Check size={14} strokeWidth={3} /> : "2",
                  },
                  {
                    key: "delivering",
                    label: "Đang giao",
                    detail: isDelivering || isDelivered ? "Đơn hàng đang được giao" : "Chờ giao hàng",
                    complete: isDelivered,
                    active: isDelivering,
                    icon: isDelivered ? <Check size={14} strokeWidth={3} /> : <Truck size={14} />,
                  },
                  {
                    key: "delivered",
                    label: "Đã giao",
                    detail: isDelivered ? "Đã giao thành công" : "Chờ hoàn tất",
                    complete: isDelivered,
                    active: false,
                    icon: isDelivered ? <Check size={14} strokeWidth={3} /> : "5",
                  },
                ].map((step, index, steps) => (
                  <li key={step.key} className="min-w-0 space-y-2">
                    <div className="flex items-center gap-1.5 py-1">
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                          step.complete
                            ? "bg-emerald-700 text-white"
                            : step.active
                            ? "bg-primary text-white"
                              : "border-2 border-outline-variant bg-surface text-on-surface-variant"
                        }`}
                      >
                        {step.active ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : step.icon}
                      </span>
                      {index < steps.length - 1 && (
                        <span className={`h-0.5 min-w-1 flex-1 ${step.complete ? "bg-emerald-600" : "bg-outline-variant/40"}`} />
                      )}
                    </div>
                    <p className={`text-xs font-bold leading-snug ${step.active ? "text-primary" : step.complete ? "text-on-surface" : "text-on-surface-variant"}`}>
                      {step.label}
                    </p>
                    <p className="text-[10px] leading-snug text-on-surface-variant">
                      {step.detail}
                    </p>
                  </li>
                ))}
              </ol>
              </div>
            ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {/* Step 1 */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-emerald-600 text-xs font-black text-white">
                    ✓
                  </div>
                  <div className="h-0.5 flex-1 bg-emerald-600" />
                </div>
                <p className="text-xs font-black text-on-surface">Tiếp nhận đơn</p>
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-600">
                  Hoàn thành
                </p>
              </div>

              {/* Step 2 */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-black text-white">
                    2
                  </div>
                  <div className="h-0.5 flex-1 bg-outline-variant/30" />
                </div>
                <p className="text-xs font-black text-primary">Xác nhận thanh toán</p>
                <p className="text-[10px] font-bold text-primary">
                  Đang chờ quét QR
                </p>
              </div>

              {/* Step 3 */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-surface-container text-xs font-bold text-on-surface-variant">
                    3
                  </div>
                  <div className="h-0.5 flex-1 bg-outline-variant/30" />
                </div>
                <p className="text-xs font-bold text-on-surface-variant">
                  Đóng gói bảo đảm
                </p>
                <p className="text-[10px] text-on-surface-variant/70">
                  Chờ thanh toán
                </p>
              </div>

              {/* Step 4 */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-surface-container text-xs font-bold text-on-surface-variant">
                    4
                  </div>
                </div>
                <p className="text-xs font-bold text-on-surface-variant">
                  Giao hàng tận tay
                </p>
                <p className="text-[10px] text-on-surface-variant/70">
                  Rider NoobStore
                </p>
              </div>
            </div>
            )}
          </section>
        </div>

        {/* Right Column: Sticky Order Overview & Destination Info */}
        <aside className="mt-6 space-y-4 lg:sticky lg:top-6 lg:mt-0">
          <div className="rounded-[18px] border border-outline-variant/20 bg-surface p-5 shadow-[0_12px_36px_rgba(55,35,24,.06)] md:p-6">
            <h3 className="mb-3.5 border-b border-outline-variant/30 pb-3 text-xs font-black uppercase tracking-wider text-on-surface">
              Thông tin giao nhận
            </h3>

            {/* Recipient & Shipping method */}
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-on-surface-variant">Người nhận:</span>
                <p className="mt-0.5 font-black text-on-surface">
                  {recipientName}{" "}
                  {recipientPhone && (
                    <span className="font-semibold text-primary">
                      · {recipientPhone}
                    </span>
                  )}
                </p>
              </div>

              <div>
                <span className="text-on-surface-variant">
                  {isPickup ? "Địa điểm nhận hàng:" : "Địa chỉ giao hàng:"}
                </span>
                <p className="mt-0.5 font-medium leading-relaxed text-on-surface">
                  {recipientAddress}
                </p>
              </div>

              <div>
                <span className="text-on-surface-variant">
                  {isPickup ? "Hình thức nhận hàng:" : "Phương thức vận chuyển:"}
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-bold text-primary">{shippingMethodName}</span>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-[#cce8d7] bg-[#f0f9f4] px-2 py-0.5 text-[10px] font-bold text-[#1e5e2e]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1e8e3e]" />
                    {isPickup ? "Sẵn sàng đón tiếp" : "NoobStore trực tiếp xử lý"}
                  </span>
                </div>
              </div>

              {/* Guarantees */}
              <div className="mt-2 space-y-1.5 rounded-xl bg-surface-container-high p-3 text-[11px] text-on-surface-variant">
                {isPickup ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Check size={14} className="shrink-0 text-[#1e8e3e] stroke-[3]" />
                      <span>Hàng được chuẩn bị và giữ tại quầy lễ tân</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check size={14} className="shrink-0 text-[#1e8e3e] stroke-[3]" />
                      <span>Kiểm tra và trải nghiệm sản phẩm trực tiếp</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check size={14} className="shrink-0 text-[#1e8e3e] stroke-[3]" />
                      <span>Kỹ thuật viên tư vấn và hỗ trợ căn chỉnh tại chỗ</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Check size={14} className="shrink-0 text-[#1e8e3e] stroke-[3]" />
                      <span>Đảm bảo an toàn 100% trong quá trình vận chuyển</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check size={14} className="shrink-0 text-[#1e8e3e] stroke-[3]" />
                      <span>Đóng gói chắc chắn, bọc lót bảo vệ cẩn thận</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check size={14} className="shrink-0 text-[#1e8e3e] stroke-[3]" />
                      <span>Rider chủ động liên hệ trước & ưu tiên thời gian người nhận</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Product items mini list */}
            {displayItems.length > 0 && (
              <div className="mt-4 border-t border-outline-variant/15 pt-3">
                <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-on-surface-variant">
                  Sản phẩm trong đơn ({displayItems.length})
                </p>
                <div className="max-h-60 space-y-3 overflow-y-auto px-2 pt-2.5 pb-1">
                  {displayItems.map((item, idx) => (
                    <div
                      key={item.id ?? idx}
                      className="flex items-start gap-3 text-xs"
                    >
                      <div className="relative shrink-0">
                        <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container">
                          {item.product.thumbnail ? (
                            <AdaptiveImage
                              src={item.product.thumbnail}
                              alt={item.product.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-outline-variant">
                              <Package size={22} />
                            </div>
                          )}
                        </div>
                        <div className="absolute -left-1 -top-1.5 z-10 grid h-5 w-5 place-items-center rounded-full bg-neutral text-[10px] font-black text-white shadow-sm ring-2 ring-surface">
                          {item.quantity}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 font-bold text-on-surface">
                          {item.product.name}
                        </p>
                        {item.variant?.variant_name && (
                          <p className="mt-0.5 truncate text-[11px] text-on-surface-variant">
                            {item.variant.variant_name}
                          </p>
                        )}
                        {item.components && item.components.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {item.components
                              .filter(
                                (c) =>
                                  !item.variant ||
                                  c.variant_name !== item.variant.variant_name,
                              )
                              .map((c, i) => (
                                <span
                                  key={c.variant_id ?? i}
                                  className="inline-flex items-center gap-1 rounded bg-surface-container px-1.5 py-0.5 text-[10px] font-medium text-on-surface-variant"
                                >
                                  {c.component_group && (
                                    <span className="opacity-70">
                                      {c.component_group}:
                                    </span>
                                  )}
                                  <span className="font-semibold text-on-surface">
                                    {c.variant_name}
                                  </span>
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 self-start font-bold text-on-surface">
                        {formatVND(item.product.base_price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Price Calculations */}
            <div className="mt-4 space-y-2 border-t border-outline-variant/15 pt-3.5 text-xs">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span>Tạm tính hàng hóa</span>
                <span className="font-bold text-on-surface">
                  {formatVND(goodsSubtotal)}
                </span>
              </div>

              {(orderDetail?.voucher_discount_amount ?? 0) > 0 && (
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span>Giảm giá đơn hàng</span>
                  <span className="font-bold text-green-600">
                    −{formatVND(orderDetail?.voucher_discount_amount ?? 0)}
                  </span>
                </div>
              )}

              {orderDetail && orderDetail.shipping_fee > 0 && (
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span>Phí vận chuyển</span>
                  <span className="font-bold text-on-surface">
                    {formatVND(orderDetail.shipping_fee)}
                  </span>
                </div>
              )}

              {(orderDetail?.shipping_discount_amount ?? 0) > 0 && (
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span>Trợ giá vận chuyển</span>
                  <span className="font-bold text-green-600">
                    −{formatVND(orderDetail?.shipping_discount_amount ?? 0)}
                  </span>
                </div>
              )}

              {/* Deposit Callout breakdown if deposit_cod */}
              {isDeposit && depositAmt && (
                <div className="my-1.5 flex items-center justify-between rounded-xl bg-primary/10 px-3.5 py-2.5 text-primary">
                  <span className="font-bold text-xs">
                    Thanh toán cọc trước ({depositPercent}%)
                  </span>
                  <span className="font-black text-sm">
                    {formatVND(depositAmt)}
                  </span>
                </div>
              )}

              {isDeposit && remainingAmt > 0 && (
                <div className="flex items-center justify-between text-on-surface-variant px-1 text-xs">
                  <span>Còn lại thanh toán COD khi nhận:</span>
                  <span className="font-bold text-on-surface">
                    {formatVND(remainingAmt)}
                  </span>
                </div>
              )}

              <div className="mt-2.5 flex items-baseline justify-between border-t-2 border-outline-variant/20 pt-3">
                <span className="text-sm font-black text-on-surface">
                  Tổng đơn hàng
                </span>
                <span className="text-xl font-black text-primary">
                  {formatVND(totalCalculated)}
                </span>
              </div>
            </div>

            {/* Actions CTA */}
            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                onClick={() =>
                  router.push(`/profile/orders?orderNumber=${orderNumber}`)
                }
                className="primary-gradient flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-xs font-black uppercase tracking-wider text-white shadow-md transition-all active:scale-[0.99]"
              >
                Theo dõi đơn hàng
              </button>
              <button
                type="button"
                onClick={() => router.push("/shop")}
                className="btn btn-outline btn-sm h-10 w-full rounded-2xl border-outline-variant/30 text-xs font-bold text-on-surface transition-all hover:border-primary hover:text-primary active:scale-[0.99]"
              >
                Tiếp tục mua sắm
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-center text-[11px] text-on-surface-variant/80">
            <Phone size={12} className="text-primary" />
            <span>
              Cần hỗ trợ đơn hàng? Gọi ngay <strong>0839.220.900</strong>
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
