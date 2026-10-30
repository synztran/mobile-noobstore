"use client";

import { OrderItemsList } from "@/components/checkout/OrderItemsList";
import { useIsMounted } from "@/hooks/useIsMounted";
import { cartItemsToGA, trackPurchase } from "@/lib/analytics";
import type { CartItem } from "@/lib/data";
import {
  useOrderDetail,
  useOrderStatus,
} from "@/lib/react-query/order/api/useOrderQueries";
import { toast } from "@/lib/toast";
import { useCheckoutStore } from "@/store";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { OrderPaymentInstructions } from "@/modules/payments/ui/OrderPaymentInstructions";

export default function CheckingPageContent({ identifier }: { identifier?: string } = {}) {
  const mounted = useIsMounted();
  const router = useRouter();

  const { orderNumber: storedOrderNumber, totalPrice, orderedItems } =
    useCheckoutStore();
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

  const { data: orderDetail } = useOrderDetail(mounted && lookupKey ? lookupKey : null);

  const orderStatus = orderStatusQuery.data?.status ?? null;
  const orderNotFound = orderStatusQuery.data?.notFound ?? false;

  // Always resolve human-readable order number: prefer server response, then store, never show UUID
  const orderNumber =
    orderStatusQuery.data?.order_number ||
    storedOrderNumber ||
    (lookupKey && !/^[0-9a-f-]{36}$/i.test(lookupKey) ? lookupKey : "");

  const displayItems = useMemo<CartItem[]>(() => {
    if (orderedItems.length > 0 && (orderNumber === storedOrderNumber || !storedOrderNumber)) {
      return orderedItems;
    }
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
    return orderedItems;
  }, [orderedItems, orderNumber, storedOrderNumber, orderDetail?.items]);

  // Fire GA4 purchase once per order (guarded via sessionStorage)
  useEffect(() => {
    if (!mounted || !orderNumber || orderNumber !== storedOrderNumber || displayItems.length === 0) return;
    const key = `ga_purchase_${orderNumber}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    trackPurchase(orderNumber, cartItemsToGA(displayItems), totalPrice || orderDetail?.total_price || 0);
  }, [mounted, orderNumber, storedOrderNumber, displayItems, totalPrice, orderDetail?.total_price]);

  const paymentIdentifier = orderNumber || lookupKey;

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
        {paymentIdentifier && (
          <OrderPaymentInstructions identifier={paymentIdentifier} />
        )}
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

      <OrderItemsList items={displayItems} />

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
