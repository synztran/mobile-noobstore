"use client";

import { ConfirmOrderDialog } from "@/components/checkout/ConfirmOrderDialog";
import { DeliveryAddressCard } from "@/components/checkout/DeliveryAddressCard";
import { DepositPaymentSection } from "@/components/checkout/DepositPaymentSection";
import { OrderItemsList } from "@/components/checkout/OrderItemsList";
import { OrderSummaryCard } from "@/components/checkout/OrderSummaryCard";
import { PreOrderBanner } from "@/components/checkout/PreOrderBanner";
import { ShippingMethodCard } from "@/components/checkout/ShippingMethodCard";
import { SummaryHeader } from "@/components/checkout/SummaryHeader";
import { RankBenefitModal } from "@/components/rank/RankBenefitModal";
import VoucherComponent from "@/components/voucher/VoucherComponent";
import { useIsMounted } from "@/hooks/useIsMounted";
import { cartItemToGA, trackRemoveFromCart } from "@/lib/analytics";
import { useMyRank } from "@/lib/react-query/rank/api/useRankQueries";
import { useValidateStock, useSubmitOrder } from "@/lib/react-query/checkout/api/useCheckoutMutations";
import { toast } from "@/lib/toast";
import { useCartStore } from "@/modules/cart/client/useCartStore";
import { useCheckoutStore, useDiscountStore } from "@/store";
import { useNavigationStore } from "@/store/navigation";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function SummaryPage() {
  const router = useRouter();
  const mounted = useIsMounted();
  const { startNavigation } = useNavigationStore();
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
  const isDeliveryService = shipping?.deliverySpeed === "shipment";

  const voucherItems = useMemo(() => {
    if (!mounted) return [];
    return rawItems.map((i) => {
      const basePrice = i.variant?.effective_price ?? i.product.base_price;
      const componentsTotal = (i.components ?? []).reduce(
        (sum, c) => sum + c.price_adjustment,
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

  const MIN_ORDER_SUBTOTAL = 1_000_000;

  useEffect(() => {
    if (subtotal < MIN_ORDER_SUBTOTAL && paymentType === "deposit_cod") {
      setPaymentType("full");
    }
  }, [subtotal, paymentType, setPaymentType]);

  useEffect(() => {
    if (isDeliveryService && paymentType === "deposit_cod") {
      setPaymentType("full");
    }
  }, [isDeliveryService, paymentType, setPaymentType]);

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
      });

      setOrder(result.order_id, result.order_number, orderTotal, items);
      setPaymentType("full");
      setDepositPercentage(50);
      clearCart();
      startNavigation();
      router.push(`/checkout/checking/${result.order_id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi kết nối, vui lòng thử lại");
      setSubmitting(false);
    }
  };

  const handleEditShipping = () => {
    router.back();
  };

  return (
    <div className="space-y-4">
      <SummaryHeader />

      {hasPreOrder && <PreOrderBanner />}

      <div className="space-y-4">
        <OrderItemsList
          items={items}
          oosProductIds={oosProductIds}
          onRemove={handleRemoveItem}
        />
      </div>

      <VoucherComponent
        subtotal={subtotal}
        shippingCost={shippingCost}
        shippingMethodId={
          shipping?.shippingMethodId ?? shipping?.deliverySpeed ?? undefined
        }
        items={voucherItems}
      />

      {shipping && shipping.deliverySpeed !== "pickup" && (
        <DeliveryAddressCard
          shipping={shipping}
          isDeliveryService={isDeliveryService}
        />
      )}

      <ShippingMethodCard shipping={shipping} onEdit={handleEditShipping} />

      <DepositPaymentSection
        paymentType={paymentType}
        setPaymentType={setPaymentType}
        depositPercentage={depositPercentage}
        setDepositPercentage={setDepositPercentage}
        hasPreOrder={hasPreOrder}
        subtotal={subtotal}
        orderTotal={orderTotal}
        disabledReason={
          isDeliveryService
            ? "Đặt cọc không hỗ trợ đơn hàng giao qua đơn vị vận chuyển."
            : undefined
        }
      />

      <OrderSummaryCard
        subtotal={subtotal}
        shippingCost={shippingCost}
        isDeliveryService={isDeliveryService}
        totalShippingDiscountAmount={totalShippingDiscountAmount}
        totalDiscountAmount={totalDiscountAmount}
        rankDiscountAmount={rankDiscountAmount}
        rankShippingDiscount={rankShippingDiscount}
        currentRank={rankData?.currentRank ?? null}
        orderTotal={orderTotal}
        submitting={submitting}
        onConfirm={() => setShowConfirm(true)}
        onRankClick={() => setRankModalOpen(true)}
      />

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
        isDeliveryService={isDeliveryService}
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
