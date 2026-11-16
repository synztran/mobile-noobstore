"use client";

import { ConfirmOrderDialog } from "@/components/checkout/ConfirmOrderDialog";
import { DepositPaymentSection } from "@/components/checkout/DepositPaymentSection";
import { OrderSummaryCard } from "@/components/checkout/OrderSummaryCard";
import { PreOrderBanner } from "@/components/checkout/PreOrderBanner";
import { RankBenefitModal } from "@/components/rank/RankBenefitModal";
import { formatVND } from "@/lib/currency";
import { Check, CheckCircle2, MapPin, Truck } from "lucide-react";
import { useIsMounted } from "@/hooks/useIsMounted";
import { cartItemToGA, trackRemoveFromCart } from "@/lib/analytics";
import { useMyRank } from "@/lib/react-query/rank/api/useRankQueries";
import {
  useValidateStock,
  useSubmitOrder,
} from "@/lib/react-query/checkout/api/useCheckoutMutations";
import { toast } from "@/lib/toast";
import { canUseDeposit, minDepositPercentage } from "@/lib/deposit";
import {
  ShippingMethod,
  isCarrierShippingMethod,
  isFeePendingShippingMethod,
  isPickupShippingMethod,
} from "@/lib/shipping-method";
import { useCartStore } from "@/modules/cart/client/hooks/useCartStore";
import { useCheckoutStore, useDiscountStore } from "@/store";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function SummaryPage() {
  const router = useRouter();
  const mounted = useIsMounted();
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [oosProductIds, setOosProductIds] = useState<Set<string>>(new Set());
  const [rankModalOpen, setRankModalOpen] = useState(false);
  const { data: rankData } = useMyRank();
  const validateStockMutation = useValidateStock();
  const submitOrderMutation = useSubmitOrder();

  const {
    items: rawItems,
    cartId,
    subtotal: getSubtotal,
    clearCart,
    removeItem,
  } = useCartStore();
  const {
    shippingCost,
    shipping,
    setOrder,
    paymentType,
    setPaymentType,
    depositPercentage,
    setDepositPercentage,
    getOrCreateIdempotencyKey,
  } = useCheckoutStore();
  const { appliedVouchers, totalDiscountAmount, totalShippingDiscountAmount } =
    useDiscountStore();

  useEffect(() => {
    setPaymentType("full");
    setDepositPercentage(50);
  }, []);

  const items = mounted ? rawItems : [];
  const subtotal = mounted ? getSubtotal() : 0;
  const hasPreOrder = items.some(
    (i) => i.is_pre_order || i.components?.some((c) => c.is_pre_order)
  );
  // Two different questions, deliberately kept apart:
  // - isCarrierMethod: fulfilled by a third-party courier, so the full
  //   ward/district/city address is shown to the customer.
  // - shippingFeePending: the inter-city courier tier only, whose fee is
  //   quoted as "Cập nhật sau" and blocks deposit.
  const isCarrierMethod = isCarrierShippingMethod(
    shipping?.shippingMethodId ?? shipping?.deliverySpeed
  );
  const shippingFeePending = isFeePendingShippingMethod(
    shipping?.shippingMethodId ?? shipping?.deliverySpeed
  );

  const voucherItems = useMemo(() => {
    if (!mounted) return [];
    return rawItems.map((i) => {
      // Components already carry their override-resolved contribution from
      // add-to-cart, and `variant.effective_price` folds in a kit's own variant
      // adjustment, so base + components is the same number the cart shows.
      const basePrice = i.variant?.effective_price ?? i.product.base_price;
      const componentsTotal = (i.components ?? []).reduce(
        (sum, c) => sum + (c.price_adjustment || 0),
        0
      );
      return {
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: basePrice + componentsTotal,
        variant_ids: [
          ...(i.variant?.id ? [i.variant.id] : []),
          ...(i.components ?? []).map((c) => c.variant_id),
        ],
      };
    });
  }, [rawItems, mounted]);

  const earliestPreOrderDate = useMemo(() => {
    const dates = items
      .flatMap((i) => {
        if (i.pre_order_config?.available_date)
          return [i.pre_order_config.available_date];
        return (i.components ?? [])
          .filter((c) => c.pre_order_config?.available_date)
          .map((c) => c.pre_order_config!.available_date!);
      })
      .filter(Boolean)
      .sort();
    return dates[0] ?? null;
  }, [items]);
  const rankDiscountPercent = rankData?.currentRank?.benefits.flags
    .discountPercentEnabled
    ? rankData.currentRank.benefits.discountPercent
    : 0;
  const rankFreeShippingEnabled = rankData?.currentRank?.benefits.flags
    .freeShippingEnabled
    ? rankData.currentRank.benefits.freeShipping
    : false;
  const rankDiscountAmount =
    rankDiscountPercent > 0
      ? Math.round((subtotal * rankDiscountPercent) / 100)
      : 0;
  const rankShippingDiscount = rankFreeShippingEnabled ? shippingCost : 0;
  const orderTotal =
    subtotal +
    shippingCost -
    totalDiscountAmount -
    totalShippingDiscountAmount -
    rankDiscountAmount -
    rankShippingDiscount;

  const isPickup = isPickupShippingMethod(
    shipping?.shippingMethodId ?? shipping?.deliverySpeed
  );
  const depositAllowed = canUseDeposit({
    hasPreOrder,
    orderTotal,
    isPickup,
    isFeePending: shippingFeePending,
  });

  useEffect(() => {
    if (!depositAllowed && paymentType === "deposit_cod") {
      setPaymentType("full");
    }
  }, [depositAllowed, paymentType, setPaymentType]);

  // Re-floor the percentage whenever the order total crosses the 5% threshold —
  // dropping items under 10M must raise a previously-legal 5% to the 30% floor.
  useEffect(() => {
    const minPct = minDepositPercentage(hasPreOrder, orderTotal);
    if (depositPercentage < minPct) {
      setDepositPercentage(minPct);
    }
  }, [hasPreOrder, orderTotal, depositPercentage, setDepositPercentage]);

  const depositAmount = Math.round((subtotal * depositPercentage) / 100);
  const codAmount = Math.max(0, orderTotal - depositAmount);

  const hasRecipientInfo = Boolean(
    shipping?.fullName?.trim() && shipping?.phoneNumber?.trim()
  );

  const hasDeliveryAddress = Boolean(
    shipping?.streetAddress?.trim() &&
    shipping?.city?.trim() &&
    (shipping?.district?.trim() || shipping?.ward?.trim())
  );

  const isShippingValid = Boolean(
    shipping && hasRecipientInfo && (isPickup ? true : hasDeliveryAddress)
  );

  const handleOpenConfirm = () => {
    if (!isShippingValid) {
      if (!hasRecipientInfo && !hasDeliveryAddress) {
        toast.error("Vui lòng nhập thông tin người nhận và địa chỉ giao hàng");
      } else if (!hasRecipientInfo) {
        toast.error("Vui lòng nhập họ tên và số điện thoại người nhận");
      } else {
        toast.error("Vui lòng nhập địa chỉ giao hàng");
      }
      router.push("/checkout/shipping");
      return;
    }
    setShowConfirm(true);
  };

  const handleRemoveItem = useCallback(
    (productId: string, variantId: string | null) => {
      const item = items.find(
        (i) =>
          i.product.id === productId && (i.variant?.id ?? null) === variantId
      );
      if (item) trackRemoveFromCart(cartItemToGA(item));
      removeItem(productId, variantId);
      setOosProductIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    },
    [items, removeItem]
  );

  if (!mounted) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-32 rounded-2xl bg-surface-container" />
        <div className="h-12 rounded-full bg-surface-container" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-surface-container" />
          ))}
        </div>
        <div className="h-32 rounded-3xl bg-surface-container" />
        <div className="h-14 rounded-full bg-surface-container" />
      </div>
    );
  }

  const handleConfirmOrder = async () => {
    if (!isShippingValid) {
      if (!hasRecipientInfo && !hasDeliveryAddress) {
        toast.error("Vui lòng nhập thông tin người nhận và địa chỉ giao hàng");
      } else if (!hasRecipientInfo) {
        toast.error("Vui lòng nhập họ tên và số điện thoại người nhận");
      } else {
        toast.error("Vui lòng nhập địa chỉ giao hàng");
      }
      router.push("/checkout/shipping");
      return;
    }
    setSubmitting(true);
    try {
      // ── Pre-check: validate stock before deducting ──────────────────
      const stockData = await validateStockMutation.mutateAsync(
        items.map((i) => ({
          product_id: i.product.id,
          product_name: i.product.name,
          variant_id: i.variant?.id ?? null,
          quantity: i.quantity,
          components: i.components,
        }))
      );

      if (!stockData.valid) {
        setOosProductIds(new Set(stockData.oos_items.map((o) => o.product_id)));
        for (const oos of stockData.oos_items) {
          if (oos.available === 0) {
            toast.error(`"${oos.product_name}" đã hết hàng`);
          } else {
            toast.warning(
              `"${oos.product_name}" chỉ còn ${oos.available} sản phẩm (bạn đang đặt ${oos.requested})`
            );
          }
        }
        setSubmitting(false);
        return;
      }
      setOosProductIds(new Set());

      const result = await submitOrderMutation.mutateAsync({
        idempotency_key: getOrCreateIdempotencyKey(),
        cart_id: cartId,
        shipping_cost: shippingCost,
        payment_type: paymentType,
        deposit_percentage:
          paymentType === "deposit_cod"
            ? Math.min(
                80,
                Math.max(
                  minDepositPercentage(hasPreOrder, orderTotal),
                  depositPercentage
                )
              )
            : undefined,
        shipping_method_id:
          shipping?.shippingMethodId ?? shipping?.deliverySpeed ?? null,
        pickup_at:
          shipping?.deliverySpeed === ShippingMethod.Pickup
            ? (shipping?.pickupAt ?? null)
            : undefined,
        delivery_address:
          shipping && shipping.deliverySpeed !== ShippingMethod.Pickup
            ? {
                full_name: shipping.fullName,
                phone_number: shipping.phoneNumber,
                street_address: shipping.streetAddress,
                apartment: shipping.apartment || null,
                district: shipping.district,
                ward: shipping.ward,
                city: shipping.city,
                district_code: shipping.districtCode || null,
                ward_code: shipping.wardCode || null,
                postal_code: shipping.postalCode || null,
                notes: shipping.notes || null,
              }
            : shipping
              ? {
                  full_name: shipping.fullName,
                  phone_number: shipping.phoneNumber,
                }
              : null,
        rank_discount:
          rankData?.currentRank &&
          (rankDiscountAmount > 0 || rankShippingDiscount > 0)
            ? {
                discount_amount: rankDiscountAmount,
                free_shipping: rankFreeShippingEnabled,
                rank_name: rankData.currentRank.name,
              }
            : undefined,
        vouchers: appliedVouchers.map((entry) => ({
          voucher_id: entry.voucherInfo.voucher_id,
          voucher_code: entry.voucherInfo.voucher_code,
          voucher_discount_amount: entry.discountAmount,
          shipping_discount_amount: entry.shippingDiscountAmount,
          voucher_snapshot: entry.voucherInfo,
          gift_items_snapshot: entry.gifts.length > 0 ? entry.gifts : null,
        })),
        items: items.map((i) => ({
          product_id: i.product.id,
          product_name: i.product.name,
          variant_id: i.variant?.id ?? null,
          thumbnail:
            i.variant?.thumbnail ??
            i.components?.find((c) => c.thumbnail)?.thumbnail ??
            i.product.thumbnail ??
            null,
          quantity: i.quantity,
          is_pre_order: i.is_pre_order ?? false,
          pre_order_config: i.pre_order_config ?? null,
          components: i.components?.map((c) => ({
            variant_id: c.variant_id,
            variant_name: c.variant_name,
            component_group: c.component_group,
            thumbnail: c.thumbnail,
            is_pre_order: c.is_pre_order ?? false,
            pre_order_config: c.pre_order_config ?? null,
          })),
        })),
      });

      setOrder(result.order_id, result.order_number, orderTotal, items);
      setPaymentType("full");
      setDepositPercentage(50);
      clearCart();
      router.push(`/checkout/checking/${result.order_number}`);
    } catch (err) {
      const errorCode =
        err instanceof Error && /^CHECKOUT_[A-Z_]+$/.test(err.message)
          ? err.message
          : null;
      toast.error(
        errorCode
          ? `Checkout failed (${errorCode}). Please contact support.`
          : "Checkout failed. Please try again or contact support."
      );
      setSubmitting(false);
    }
  };

  const handleEditShipping = () => {
    router.push("/checkout/shipping");
  };

  const deliveryLabel = isPickup
    ? "Nhận tại cửa hàng"
    : shipping?.deliverySpeed === ShippingMethod.Express
      ? "Giao Hỏa tốc"
      : shipping?.deliverySpeed === ShippingMethod.Carrier4h
        ? "Giao nhanh 4H qua ĐVVC"
        : "Giao Tiêu chuẩn";

  return (
    <div className="space-y-4">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_410px] lg:items-start lg:gap-8">
        {/* Left Column: Review Details & Payment Selection */}
        <div className="space-y-4">
          {/* Card 1: Recipient & Address */}
          <section
            className={`rounded-2xl border p-4 shadow-ambient-sm transition-colors md:p-5 ${
              !isShippingValid
                ? "border-rose-500/40 bg-rose-500/5"
                : "border-outline-variant/20 bg-surface"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-xl ${
                    !isShippingValid
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      : "bg-emerald-500/10 text-emerald-600"
                  }`}
                >
                  <MapPin size={18} />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-bold text-on-surface">
                    {isPickup ? (
                      <div className="space-y-0.5">
                        <span>Nhận tại cửa hàng: NoobStore HCM</span>
                        {shipping?.fullName ? (
                          <p className="text-xs font-semibold text-primary">
                            Người nhận: {shipping.fullName} -{" "}
                            {shipping.phoneNumber}
                          </p>
                        ) : (
                          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                            Chưa có thông tin người nhận
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <p className="font-bold text-on-surface">
                          {shipping?.fullName || (
                            <span className="text-rose-600 dark:text-rose-400">
                              Chưa có tên người nhận
                            </span>
                          )}
                        </p>
                        {shipping?.phoneNumber ? (
                          <p className="text-xs font-semibold text-primary">
                            {shipping.phoneNumber}
                          </p>
                        ) : (
                          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                            Chưa có số điện thoại
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    {isPickup
                      ? "70/4b đường 47, Phường Hiệp Bình Chánh, Thủ Đức, TP.Hồ Chí Minh"
                      : (isCarrierMethod
                          ? [
                              shipping?.apartment,
                              shipping?.streetAddress,
                              shipping?.ward,
                              shipping?.district,
                              shipping?.city,
                            ]
                          : [shipping?.apartment, shipping?.streetAddress]
                        )
                          .filter(Boolean)
                          .join(", ") || (
                          <span className="text-rose-600 dark:text-rose-400">
                            Chưa có địa chỉ giao hàng
                          </span>
                        )}
                  </p>
                  {shipping?.notes && (
                    <p className="text-[11px] text-on-surface-variant">
                      <span className="font-bold">Ghi chú:</span>{" "}
                      {shipping.notes}
                    </p>
                  )}
                  {!isShippingValid && (
                    <div className="mt-2 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                      ⚠️ Cần nhập thông tin người nhận và địa chỉ giao hàng
                      trước khi đặt hàng.
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleEditShipping}
                className={`flex-shrink-0 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${
                  !isShippingValid
                    ? "border-rose-500/40 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400"
                    : "border-outline-variant/40 bg-surface text-on-surface-variant hover:border-primary hover:text-primary"
                }`}
              >
                {isShippingValid ? "Thay đổi" : "Bổ sung thông tin"}
              </button>
            </div>
          </section>

          {/* Card 2: Delivery Method & NoobStore Shipping Features */}
          <section className="rounded-2xl border border-outline-variant/20 bg-surface p-4 shadow-ambient-sm md:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Truck size={18} />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-on-surface">
                      {deliveryLabel}
                    </span>
                    {!isPickup && !isCarrierMethod ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-[#cce8d7] bg-[#f0f9f4] px-2 py-0.5 text-[10px] font-bold text-[#1e5e2e]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#1e8e3e]" />
                        NoobStore trực tiếp xử lý
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-surface-container px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">
                        {isPickup ? "Nhận tại shop" : "ĐVVC đối tác"}
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-bold text-primary">
                    Cước phí:{" "}
                    {shippingFeePending
                      ? "Cập nhật sau"
                      : shippingCost === 0
                        ? "Miễn phí"
                        : formatVND(shippingCost)}
                  </p>

                  {/* NoobStore Guarantee list */}
                  {!isPickup && !isCarrierMethod && (
                    <div className="mt-3 space-y-1.5 border-t border-outline-variant/15 pt-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
                        Đặc quyền giao nhận từ NoobStore
                      </p>
                      <ul className="space-y-1.5 text-xs text-on-surface-variant">
                        <li className="flex items-center gap-2">
                          <Check
                            size={14}
                            className="flex-shrink-0 stroke-[3] text-[#1e8e3e]"
                          />
                          <span>
                            Đảm bảo an toàn 100% trong quá trình vận chuyển
                          </span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check
                            size={14}
                            className="flex-shrink-0 stroke-[3] text-[#1e8e3e]"
                          />
                          <span>
                            Đóng gói chắc chắn, bọc lót bảo vệ cẩn thận
                          </span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check
                            size={14}
                            className="flex-shrink-0 stroke-[3] text-[#1e8e3e]"
                          />
                          <span>
                            Rider chủ động liên hệ trước & ưu tiên thời gian
                            người nhận
                          </span>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleEditShipping}
                className="flex-shrink-0 rounded-xl border border-outline-variant/40 bg-surface px-3 py-1.5 text-xs font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
              >
                Đổi phương thức
              </button>
            </div>
          </section>

          {/* Card 3: Payment & Deposit Method */}
          <section className="rounded-2xl border border-outline-variant/20 bg-surface p-4 shadow-ambient-sm md:p-6">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-xs font-black text-primary">
                💳
              </div>
              <div>
                <h3 className="text-sm font-bold text-on-surface">
                  Hình thức thanh toán
                </h3>
                <p className="text-[11px] text-on-surface-variant">
                  Chọn phương thức thanh toán hoặc đặt cọc phù hợp với bạn
                </p>
              </div>
            </div>

            <DepositPaymentSection
              paymentType={paymentType}
              setPaymentType={setPaymentType}
              depositPercentage={depositPercentage}
              setDepositPercentage={setDepositPercentage}
              hasPreOrder={hasPreOrder}
              subtotal={subtotal}
              orderTotal={orderTotal}
              disabledReason={
                shippingFeePending
                  ? "Đặt cọc không hỗ trợ đơn hàng giao qua đơn vị vận chuyển."
                  : undefined
              }
            />
          </section>

          {/* Banner Pre-order moved to the bottom */}
          {hasPreOrder && <PreOrderBanner />}
        </div>

        {/* Right Column: Unified Sticky Overview (Cart Preview, Voucher, Price Breakdown, Submit CTA) */}
        <aside className="mt-4 lg:sticky lg:top-6 lg:mt-0">
          <OrderSummaryCard
            subtotal={subtotal}
            shippingCost={shippingCost}
            shippingFeePending={shippingFeePending}
            totalShippingDiscountAmount={totalShippingDiscountAmount}
            totalDiscountAmount={totalDiscountAmount}
            rankDiscountAmount={rankDiscountAmount}
            rankShippingDiscount={rankShippingDiscount}
            currentRank={rankData?.currentRank ?? null}
            orderTotal={orderTotal}
            submitting={submitting}
            onConfirm={handleOpenConfirm}
            onRankClick={() => setRankModalOpen(true)}
            shippingMethodId={
              shipping?.shippingMethodId ?? shipping?.deliverySpeed ?? undefined
            }
            voucherItems={voucherItems}
            paymentType={paymentType}
            depositPercentage={depositPercentage}
            isShippingValid={isShippingValid}
          />
        </aside>
      </div>

      <ConfirmOrderDialog
        showConfirm={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          setShowConfirm(false);
          handleConfirmOrder();
        }}
        submitting={submitting}
        itemCount={items.length}
        subtotal={subtotal}
        shippingCost={shippingCost}
        shippingFeePending={shippingFeePending}
        totalDiscountAmount={totalDiscountAmount}
        totalShippingDiscountAmount={totalShippingDiscountAmount}
        rankDiscountAmount={rankDiscountAmount}
        rankShippingDiscount={rankShippingDiscount}
        orderTotal={orderTotal}
        paymentType={paymentType}
        depositPercentage={depositPercentage}
        depositAmount={depositAmount}
        codAmount={codAmount}
      />

      {rankData?.currentRank && (
        <RankBenefitModal
          open={rankModalOpen}
          onClose={() => setRankModalOpen(false)}
          currentRank={rankData.currentRank}
          allRanks={rankData.allRanks}
        />
      )}
    </div>
  );
}
