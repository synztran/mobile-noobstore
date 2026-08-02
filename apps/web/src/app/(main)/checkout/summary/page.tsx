"use client";

import { SubmitOrderResponse } from "@/app/api/checkout/submit/route";
import type { ValidateStockResponse } from "@/app/api/checkout/validate-stock/route";
import { OrderItemsList } from "@/components/checkout/OrderItemsList";
import { DepositPaymentSection } from "@/components/checkout/DepositPaymentSection";
import { RankBadge } from "@/components/rank/RankBadge";
import { RankBenefitModal } from "@/components/rank/RankBenefitModal";
import VoucherComponent from "@/components/voucher/VoucherComponent";
import { useIsMounted } from "@/hooks/useIsMounted";
import { formatVND } from "@/lib/currency";
import { useMyRank } from "@/lib/react-query/rank/api/useRankQueries";
import { toast } from "@/lib/toast";
import { useCartStore, useCheckoutStore, useDiscountStore } from "@/store";
import { useNavigationStore } from "@/store/navigation";
import {
  ArrowRight,
  CheckCircle,
  ShoppingBag,
  Store,
  Truck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

function formatPickupSlot(value?: string | null): string {
  if (!value) return "Chưa chọn thời gian";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SummaryPage() {
  const router = useRouter();
  const mounted = useIsMounted();
  const { startNavigation } = useNavigationStore();
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [oosProductIds, setOosProductIds] = useState<Set<string>>(new Set());
  const [rankModalOpen, setRankModalOpen] = useState(false);
  const { data: rankData } = useMyRank();

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
  } = useCheckoutStore();
  const {
    appliedVouchers,
    totalDiscountAmount,
    totalShippingDiscountAmount,
    totalGiftItems,
  } = useDiscountStore();

  useEffect(() => {
    setPaymentType("full");
    setDepositPercentage(50);
  }, []);

  const items = mounted ? rawItems : [];
  const subtotal = mounted ? getSubtotal() : 0;
  const hasPreOrder = items.some(
    (i) => i.is_pre_order || i.components?.some((c) => c.is_pre_order)
  );

  const MIN_ORDER_SUBTOTAL = 1_000_000;

  useEffect(() => {
    if (subtotal < MIN_ORDER_SUBTOTAL && paymentType === "deposit_cod") {
      setPaymentType("full");
    }
  }, [subtotal, paymentType, setPaymentType]);

  useEffect(() => {
    const minPct = hasPreOrder ? 20 : 10;
    if (depositPercentage < minPct) {
      setDepositPercentage(minPct);
    }
  }, [hasPreOrder, depositPercentage, setDepositPercentage]);
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

  const depositAmount = Math.round((subtotal * depositPercentage) / 100);
  const codAmount = Math.max(0, orderTotal - depositAmount);

  const handleRemoveItem = useCallback(
    (productId: string, variantId: string | null) => {
      removeItem(productId, variantId);
      setOosProductIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    },
    [removeItem],
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
    setSubmitting(true);
    try {
      // ── Pre-check: validate stock before deducting ──────────────────
      const stockRes = await fetch("/api/checkout/validate-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            product_id: i.product.id,
            product_name: i.product.name,
            variant_id: i.variant?.id ?? null,
            quantity: i.quantity,
            components: i.components,
          })),
        }),
      });
      const stockData: ValidateStockResponse = await stockRes.json();

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

      const payloadCheckoutSubmit = {
        cart_id: cartId,
        shipping_cost: shippingCost,
        payment_type: paymentType,
        deposit_percentage:
          paymentType === "deposit_cod" ? depositPercentage : undefined,
        shipping_method_id:
          shipping?.shippingMethodId ?? shipping?.deliverySpeed ?? null,
        pickup_at:
          shipping?.deliverySpeed === "pickup"
            ? (shipping?.pickupAt ?? null)
            : undefined,
        delivery_address:
          shipping && shipping.deliverySpeed !== "pickup"
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
      };
      // ────────────────────────────────────────────────────────────────
      const res = await fetch("/api/checkout/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadCheckoutSubmit),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Không thể tạo đơn hàng");
        setSubmitting(false);
        return;
      }
      const result = data as SubmitOrderResponse;
      setOrder(result.order_id, result.order_number, orderTotal, items);
      setPaymentType("full");
      setDepositPercentage(50);
      clearCart();
      startNavigation();
      router.push(`/checkout/checking/${result.order_id}`);
    } catch {
      toast.error("Lỗi kết nối, vui lòng thử lại");
      setSubmitting(false);
    }
  };

  const handleEditShipping = () => {
    router.back();
  };

  return (
    <div className="space-y-4">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-surface-container to-surface-container-low p-4">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-secondary/10 blur-xl" />
        <div className="relative flex items-center gap-4">
          <div className="primary-gradient flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl shadow-ambient-sm">
            <ShoppingBag className="text-white" />
          </div>
          <div>
            <p className="mb-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              Bước 02 / 03
            </p>
            <h2 className="text-2xl font-black tracking-tight text-on-surface">
              Kiểm tra đơn hàng
            </h2>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              Xem lại thông tin trước khi xác nhận đơn hàng
            </p>
          </div>
        </div>
      </div>

      {/* ── Pre-order Info Banner ────────────────────────────── */}
      {hasPreOrder && (
        <div className="overflow-hidden rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-violet-700">
              Sản phẩm Pre-order
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-violet-600">
              Đơn hàng có sản phẩm pre-order. Thời gian giao hàng dự kiến dựa
              vào thời gian hàng về đến shop. Do vấn đề hải quan, nên thời gian
              có thể delay thêm
            </p>
          </div>
        </div>
      )}

      {/* ── Order Items ──────────────────────────────────────── */}
      <div className="space-y-4">
        <OrderItemsList
          items={items}
          oosProductIds={oosProductIds}
          onRemove={handleRemoveItem}
        />
      </div>

      {/* ── Voucher / Discount ───────────────────────────────── */}
      <VoucherComponent subtotal={subtotal} shippingCost={shippingCost} />

      {/* ── Delivery Address ────────────────────────────── */}
      {shipping && shipping.deliverySpeed !== "pickup" && (
        <div className="space-y-1 overflow-hidden rounded-2xl bg-surface-container-low px-4 py-4">
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Thông tin nhận hàng
          </p>
          <p className="text-sm font-bold text-on-surface">
            {shipping.fullName}{" "}
            <span className="font-normal text-on-surface-variant">
              · {shipping.phoneNumber}
            </span>
          </p>
          <p className="text-sm text-on-surface-variant">
            {[shipping.apartment, shipping.streetAddress]
              .filter(Boolean)
              .join(", ")}
          </p>
          {shipping.notes ? (
            <p className="space-x-1">
              <strong className="text-sm">Ghi chú:</strong>
              <small>{shipping.notes}</small>
            </p>
          ) : null}
        </div>
      )}

      {/* ── Shipping Method ──────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl bg-surface-container-low">
        <div className="flex items-center justify-between p-4 gap-4">
          <div className="flex flex-1 items-start gap-2">
            <div className="primary-gradient flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl">
              {shipping?.deliverySpeed === "pickup" ? (
                <Store className="text-lg text-white" />
              ) : (
                <Truck className="text-lg text-white" />
              )}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                {shipping?.deliverySpeed === "pickup"
                  ? "Hình thức nhận hàng"
                  : "Vận chuyển"}
              </p>
              <p className="text-sm font-bold text-on-surface">
                {shipping?.deliverySpeed === "pickup"
                  ? "Nhận tại cửa hàng"
                  : shipping?.deliverySpeed === "express"
                    ? "Hỏa tốc"
                    : "Tiêu chuẩn"}
              </p>
              <p className="mt-0.5 text-xs text-on-surface-variant">
                {shipping?.deliverySpeed === "pickup"
                  ? shipping?.pickupAt
                    ? `Hẹn giờ: ${formatPickupSlot(shipping.pickupAt)}`
                    : "NoobStore sẽ chủ động liên hệ bạn khi sản phẩm đã về hàng"
                  : shipping?.deliverySpeed === "express"
                    ? "Dự kiến: 2–4 giờ"
                    : "Dự kiến: 12–24 giờ"}
              </p>
            </div>
          </div>
          <button
            onClick={handleEditShipping}
            className="text-xs font-black uppercase tracking-widest text-primary transition-opacity hover:opacity-70"
          >
            Sửa
          </button>
        </div>
      </div>

      {/* ── Payment Method ─────────────────────────────────── */}
      <DepositPaymentSection
        paymentType={paymentType}
        setPaymentType={setPaymentType}
        depositPercentage={depositPercentage}
        setDepositPercentage={setDepositPercentage}
        hasPreOrder={hasPreOrder}
        subtotal={subtotal}
        orderTotal={orderTotal}
      />

      {/* ── Order Summary ────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl bg-surface-container-low">
        <div className="space-y-4 px-4 pb-3 pt-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Tóm tắt đơn hàng
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">Tạm tính</span>
              <span className="font-bold text-on-surface">
                {formatVND(subtotal)}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">Phí vận chuyển</span>
              <span className="font-bold text-on-surface">
                {shippingCost === 0 ? "Miễn phí" : formatVND(shippingCost)}
              </span>
            </div>

            {totalDiscountAmount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">
                  Giảm giá voucher
                </span>
                <span className="font-bold text-emerald-600">
                  -{formatVND(totalDiscountAmount)}
                </span>
              </div>
            )}

            {totalShippingDiscountAmount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">
                  Giảm phí vận chuyển
                </span>
                <span className="font-bold text-emerald-600">
                  -{formatVND(totalShippingDiscountAmount)}
                </span>
              </div>
            )}

            {rankDiscountAmount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-on-surface-variant">
                  {rankData?.currentRank && (
                    <RankBadge
                      rank={rankData.currentRank}
                      size="sm"
                      onClick={() => setRankModalOpen(true)}
                    />
                  )}
                  Giảm giá thành viên
                </span>
                <span className="font-bold text-emerald-600">
                  -{formatVND(rankDiscountAmount)}
                </span>
              </div>
            )}

            {rankShippingDiscount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-on-surface-variant">
                  {rankData?.currentRank && (
                    <RankBadge
                      rank={rankData.currentRank}
                      size="sm"
                      onClick={() => setRankModalOpen(true)}
                    />
                  )}
                  Miễn ship thành viên
                </span>
                <span className="font-bold text-emerald-600">
                  -{formatVND(rankShippingDiscount)}
                </span>
              </div>
            )}

            <div className="h-px bg-outline-variant/30" />

            <div className="flex items-center justify-between text-base">
              <span className="font-bold text-on-surface">Tổng cộng</span>
              <span className="text-lg font-black text-primary">
                {formatVND(orderTotal)}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowConfirm(true)}
          disabled={submitting}
          className="primary-gradient flex w-full items-center justify-center gap-2 rounded-b-3xl py-4 text-sm font-black uppercase tracking-widest text-white transition-opacity active:opacity-90 disabled:opacity-60"
        >
          {submitting ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <>
              Xác nhận đơn hàng
              <ArrowRight className="text-lg" />
            </>
          )}
        </button>
      </div>

      {/* Confirmation Dialog */}
      <dialog
        className={`modal modal-bottom !mt-0 sm:modal-middle ${showConfirm ? "modal-open" : ""}`}
      >
        <div className="modal-box rounded-2xl bg-surface px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6">
          <div className="flex flex-col items-center py-2 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle size={32} className="text-emerald-600" />
            </div>
            <p className="mb-6 text-lg font-black text-on-surface">
              Xác nhận đặt hàng
            </p>
          </div>

          <div className="mb-6 space-y-3 rounded-2xl bg-surface-container-low p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Tóm tắt đơn hàng
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">Số lượng sản phẩm</span>
              <span className="font-bold text-on-surface">{items.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">Tạm tính</span>
              <span className="font-bold text-on-surface">
                {formatVND(subtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">Phí vận chuyển</span>
              <span className="font-bold text-on-surface">
                {shippingCost === 0 ? "Miễn phí" : formatVND(shippingCost)}
              </span>
            </div>
            {totalDiscountAmount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">Giảm giá</span>
                <span className="font-bold text-emerald-600">
                  -{formatVND(totalDiscountAmount)}
                </span>
              </div>
            )}
            {totalShippingDiscountAmount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">
                  Giảm phí vận chuyển
                </span>
                <span className="font-bold text-emerald-600">
                  -{formatVND(totalShippingDiscountAmount)}
                </span>
              </div>
            )}
            {rankDiscountAmount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">
                  Giảm giá thành viên
                </span>
                <span className="font-bold text-emerald-600">
                  -{formatVND(rankDiscountAmount)}
                </span>
              </div>
            )}
            {rankShippingDiscount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">
                  Miễn ship thành viên
                </span>
                <span className="font-bold text-emerald-600">
                  -{formatVND(rankShippingDiscount)}
                </span>
              </div>
            )}
            <div className="h-px bg-outline-variant/30" />
            <div className="flex items-center justify-between">
              <span className="font-bold text-on-surface">Tổng cộng</span>
              <span className="text-lg font-black text-primary">
                {formatVND(orderTotal)}
              </span>
            </div>
          </div>

          {paymentType === "deposit_cod" && (
            <div className="mb-6 space-y-2 rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                Thanh toán
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">
                  Đặt cọc ({depositPercentage}%)
                </span>
                <span className="font-bold text-primary">
                  {formatVND(depositAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">Còn lại (COD)</span>
                <span className="font-bold text-secondary">
                  {formatVND(codAmount)}
                </span>
              </div>
              <div className="h-px bg-primary/10" />
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-on-surface">
                  Cần chuyển khoản ngay
                </span>
                <span className="font-black text-primary">
                  {formatVND(depositAmount)}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 rounded-2xl bg-surface-container py-4 text-xs font-black uppercase tracking-widest text-on-surface transition-transform active:scale-95"
            >
              Huỷ
            </button>
            <button
              onClick={() => {
                setShowConfirm(false);
                handleConfirmOrder();
              }}
              disabled={submitting}
              className="primary-gradient flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 text-xs font-black uppercase tracking-widest text-white transition-transform active:scale-95 disabled:opacity-60"
            >
              {submitting ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "Xác nhận"
              )}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setShowConfirm(false)}>close</button>
        </form>
      </dialog>

      {/* Rank Benefit Modal */}
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
