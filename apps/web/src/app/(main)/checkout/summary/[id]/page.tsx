"use client";

import { SubmitOrderResponse } from "@/app/api/checkout/submit/route";
import type { ValidateStockResponse } from "@/app/api/checkout/validate-stock/route";
import { OrderItemsList } from "@/components/checkout/OrderItemsList";
import VoucherComponent from "@/components/voucher/VoucherComponent";
import { useIsMounted } from "@/hooks/useIsMounted";
import { formatVND } from "@/lib/currency";
import { toast } from "@/lib/toast";
import { useCartStore, useCheckoutStore, useDiscountStore } from "@/store";
import { ArrowRight, ShoppingBag, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SummaryPage() {
  const router = useRouter();
  const mounted = useIsMounted();
  const [submitting, setSubmitting] = useState(false);
  const [oosProductIds, setOosProductIds] = useState<Set<string>>(new Set());

  const {
    items: rawItems,
    cartId,
    subtotal: getSubtotal,
    clearCart,
    removeItem,
  } = useCartStore();
  const { shippingCost, shipping, setOrder } = useCheckoutStore();
  const { discountAmount, shippingDiscountAmount, appliedVoucher, giftItems } =
    useDiscountStore();

  const items = mounted ? rawItems : [];
  const subtotal = mounted ? getSubtotal() : 0;
  const orderTotal =
    subtotal + shippingCost - discountAmount - shippingDiscountAmount;

  if (!mounted) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-32 rounded-3xl bg-surface-container" />
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
      // Clear any previous OOS markers on successful validation
      setOosProductIds(new Set());

      const payloadCheckoutSubmit = {
        cart_id: cartId,
        shipping_cost: shippingCost,
        shipping_method_id:
          shipping?.shippingMethodId ?? shipping?.deliverySpeed ?? null,
        delivery_address: shipping
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
            }
          : null,
        vouchers: [
          {
            voucher_id: appliedVoucher?.voucher_id ?? null,
            voucher_code: appliedVoucher?.voucher_code ?? null,
            voucher_discount_amount: discountAmount,
            shipping_discount_amount: shippingDiscountAmount,
            voucher_snapshot: appliedVoucher,
            gift_items_snapshot: giftItems,
          },
        ],
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
          components: i.components?.map((c) => ({
            variant_id: c.variant_id,
            variant_name: c.variant_name,
            component_group: c.component_group,
            thumbnail: c.thumbnail,
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
      clearCart();
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-surface-container to-surface-container-low p-4">
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
        {/* Progress bar */}
        {/* <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
          <div className="primary-gradient h-full w-2/3 rounded-full" />
        </div> */}
      </div>

      {/* ── Order Items ──────────────────────────────────────── */}
      <div className="space-y-4">
        <OrderItemsList
          items={items}
          oosProductIds={oosProductIds}
          onRemove={(productId, variantId) => {
            removeItem(productId, variantId);
            setOosProductIds((prev) => {
              const next = new Set(prev);
              next.delete(productId);
              return next;
            });
          }}
        />
      </div>

      {/* ── Voucher / Discount ───────────────────────────────── */}
      <div>
        <VoucherComponent subtotal={subtotal} />
      </div>

      {/* ── Delivery Address ────────────────────────────── */}
      {shipping && (
        <div className="space-y-1 overflow-hidden rounded-3xl bg-surface-container-low px-4 py-4">
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
            {[
              shipping.streetAddress,
              shipping.apartment,
              shipping.ward,
              shipping.district,
              shipping.city,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
      )}

      {/* ── Shipping Method ──────────────────────────────────── */}
      <div className="overflow-hidden rounded-3xl bg-surface-container-low">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex flex-1 items-center gap-3">
            <div className="primary-gradient flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl">
              <Truck className="text-lg text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                Vận chuyển
              </p>
              <p className="text-sm font-bold text-on-surface">
                {shipping?.deliverySpeed === "express"
                  ? "Hỏa tốc"
                  : "Tiêu chuẩn"}
              </p>
              <p className="mt-0.5 text-xs text-on-surface-variant">
                {shipping?.deliverySpeed === "express"
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

      {/* ── Order Summary ────────────────────────────────────── */}
      <div className="overflow-hidden rounded-3xl bg-surface-container-low">
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

            {discountAmount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">
                  Giảm giá voucher
                </span>
                <span className="font-bold text-emerald-600">
                  -{formatVND(discountAmount)}
                </span>
              </div>
            )}

            {shippingDiscountAmount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">
                  Giảm phí vận chuyển
                </span>
                <span className="font-bold text-emerald-600">
                  -{formatVND(shippingDiscountAmount)}
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
          onClick={handleConfirmOrder}
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
    </div>
  );
}
