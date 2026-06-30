"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tag, X } from "lucide-react";
import OrderActionBar from "./OrderActionBar";
import OrderCustomerInfo from "./OrderCustomerInfo";
import OrderItemsList from "./OrderItemsList";
import OrderShippingDetails from "./OrderShippingDetails";
import OrderServicesList from "./OrderServicesList";
import OrderStatusBanner from "./OrderStatusBanner";
import OrderTimeline from "./OrderTimeline";

interface KitComponent {
  id: string;
  component_group: string;
  variant_name: string;
  price_adjustment: number | null;
  product_variant_id: string;
  thumbnail: string | null;
  is_pre_order: boolean;
  pre_order_config: unknown;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  thumbnail: string | null;
  order_item_components: KitComponent[];
}

interface OrderService {
  id: string;
  service_id: string | null;
  service_name: string | null;
  price: number;
  quantity: number;
  selected_options: Record<
    string,
    { option_value_id: number; price_adjustment: number }
  >;
  customer_note: string | null;
  services: { base_price: number } | null;
}

export interface OrderDetail {
  id: string;
  order_number: string;
  status: string;
  total_price: number;
  shipping_fee: number | null;
  shipping_method_id: string | null;
  expected_delivery_at: string | null;
  delivery_address: {
    full_name?: string | null;
    phone_number?: string | null;
    address_line?: string | null;
    street_address?: string | null;
    apartment?: string | null;
    district?: string | null;
    ward?: string | null;
    district_code?: string | null;
    ward_code?: string | null;
    city?: string | null;
    postal_code?: string | null;
  } | null;
  voucher_code: string | null;
  voucher_discount_amount: number;
  shipping_discount_amount: number;
  shippingMethodMap: Record<string, string>;
  shippingAddress: {
    full_name: string | null;
    phone_number: string | null;
    address_line: string;
    street_address?: string | null;
    apartment?: string | null;
    district?: string | null;
    ward?: string | null;
    district_code?: string | null;
    ward_code?: string | null;
    city: string;
    postal_code?: string | null;
  } | null;
  created_at: string | null;
  updated_at: string | null;
  cancelled_at: string | null;
  cancelled_note: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  delivering_at: string | null;
  delivered_at: string | null;
  users: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone_number: string | null;
  } | null;
  order_items: OrderItem[];
  order_item_components: {
    id: string;
    component_group: string;
    variant_name: string;
    price_adjustment: number | null;
    product_variant_id: string;
    thumbnail: string | null;
  }[];
  order_services: OrderService[];
  optionValueMap: Record<string, { optionLabel: string; valueLabel: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeOrder(data: any): OrderDetail {
  return {
    ...data,
    order_items: data.order_items ?? [],
    order_item_components: data.order_item_components ?? [],
    order_services: data.order_services ?? [],
    optionValueMap: data.optionValueMap ?? {},
    shippingMethodMap: data.shippingMethodMap ?? {},
  };
}

async function fetchOrderDetail(id: string): Promise<OrderDetail> {
  const res = await fetch(`/api/orders/${id}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return normalizeOrder(data);
}

interface Props {
  orderId: string | null;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

function OrderPriceSummary({ order }: { order: OrderDetail }) {
  const productsSubtotal = order.order_items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );
  const servicesSubtotal = order.order_services.reduce(
    (sum, service) => sum + service.price * service.quantity,
    0
  );
  const productsCount = order.order_items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const servicesCount = order.order_services.reduce(
    (sum, service) => sum + service.quantity,
    0
  );
  const subtotal = productsSubtotal + servicesSubtotal;
  const totalDiscount =
    order.shipping_discount_amount + order.voucher_discount_amount;

  return (
    <div className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div>
        <div className="text-sm font-semibold text-slate-800">
          Price Summary&nbsp;
          {productsCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] text-slate-700">
              {productsCount} product item
              {productsCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {servicesCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] text-slate-700">
              {servicesCount} service item
              {servicesCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2.5 rounded-lg border border-slate-200 bg-white p-3">
        {order.order_items.length > 0 && (
          <div className="flex justify-between text-sm text-slate-600">
            <span>Products</span>
            <span className="font-medium text-slate-800">
              {productsSubtotal.toLocaleString("vi-VN")}₫
            </span>
          </div>
        )}
        {order.order_services.length > 0 && (
          <div className="flex justify-between text-sm text-slate-600">
            <span>Services</span>
            <span className="font-medium text-slate-800">
              {servicesSubtotal.toLocaleString("vi-VN")}₫
            </span>
          </div>
        )}
        <div className="flex justify-between border-t border-slate-100 pt-1 text-sm text-slate-600">
          <span>Subtotal</span>
          <span className="font-medium text-slate-900">
            {subtotal.toLocaleString("vi-VN")}₫
          </span>
        </div>
      </div>

      <div className="space-y-2.5 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Delivery</span>
          <span className="font-medium text-slate-800">
            {order.shipping_fee !== null
              ? `${order.shipping_fee.toLocaleString("vi-VN")}₫`
              : "—"}
          </span>
        </div>

        {order.shipping_discount_amount > 0 && (
          <div className="flex justify-between text-sm text-emerald-700">
            <span>Delivery discount</span>
            <span>
              −{order.shipping_discount_amount.toLocaleString("vi-VN")}₫
            </span>
          </div>
        )}

        {order.voucher_code ? (
          <>
            <div className="flex items-center gap-1.5 pt-1">
              <Tag className="h-3.5 w-3.5 shrink-0 text-green-500" />
              <span className="rounded border border-green-200 bg-green-50 px-1.5 py-0.5 font-mono text-xs text-green-700">
                {order.voucher_code}
              </span>
            </div>
            <div className="flex justify-between text-sm text-emerald-700">
              <span>Voucher discount</span>
              <span>
                −{order.voucher_discount_amount.toLocaleString("vi-VN")}₫
              </span>
            </div>
          </>
        ) : (
          <p className="pt-1 text-xs italic text-slate-400">
            No voucher applied
          </p>
        )}
      </div>

      {totalDiscount > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          You saved {totalDiscount.toLocaleString("vi-VN")}₫ on this order
        </div>
      )}

      <div className="rounded-lg bg-primary px-3 py-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-slate-200">Total</span>
          <span className="text-xl font-black text-white">
            {order.total_price.toLocaleString("vi-VN")}₫
          </span>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailModal({
  orderId,
  onClose,
  onStatusUpdated,
}: Props) {
  const queryClient = useQueryClient();

  const {
    data: order,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["order-detail", orderId],
    queryFn: () => fetchOrderDetail(orderId!),
    enabled: !!orderId,
    staleTime: 30_000,
  });

  const handleUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["order-detail", orderId] });
    onStatusUpdated?.();
  };

  if (!orderId) return null;

  const customerName = order?.users
    ? `${order.users.first_name ?? ""} ${order.users.last_name ?? ""}`.trim() ||
      order.users.email
    : "—";

  const shippingMethodName = order?.shipping_method_id
    ? (order.shippingMethodMap?.[order.shipping_method_id] ??
      order.shipping_method_id)
    : null;

  return (
    <div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-max flex-col rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Order Detail
            </h2>
            {order && (
              <p className="mt-0.5 font-mono text-sm text-slate-500">
                #{order.order_number}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 transition-colors hover:bg-slate-100"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0">
          {/* Left column — flex-col: scrollable content on top, actions pinned at bottom */}
          <div className="flex flex-1 flex-col">
            {/* Scrollable content */}
            <div className="flex-1 space-y-4 overflow-y-auto py-4 pl-4">
              {isLoading && (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  Loading…
                </div>
              )}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error instanceof Error
                    ? error.message
                    : "Failed to load order"}
                </div>
              )}
              {order && !isLoading && (
                <>
                  <OrderCustomerInfo
                    customerName={customerName}
                    email={order.users?.email}
                    phoneNumber={order.users?.phone_number}
                    status={order.status}
                  />

                  <OrderStatusBanner
                    status={order.status}
                    updatedAt={order.updated_at}
                    cancelledNote={order.cancelled_note}
                  />

                  <OrderShippingDetails
                    deliveryAddress={order.delivery_address}
                    fallbackAddress={order.shippingAddress}
                    shippingMethodName={shippingMethodName}
                    expectedDeliveryAt={order.expected_delivery_at}
                  />

                  {/* Order history timeline */}
                  {/* <OrderTimeline
										createdAt={order.created_at}
										paidAt={order.paid_at}
										cancelledAt={order.cancelled_at}
										cancelledNote={order.cancelled_note}
										refundedAt={order.refunded_at}
										status={order.status}
										updatedAt={order.updated_at}
									/> */}

                  <OrderItemsList items={order.order_items} />

                  <OrderServicesList
                    services={order.order_services}
                    optionValueMap={order.optionValueMap}
                  />
                </>
              )}
            </div>

            {/* Actions — pinned at bottom of left column */}
            {order && !isLoading && (
              <OrderActionBar
                // orderId={order.id}
                order={order}
                currentStatus={order.status}
                onUpdated={handleUpdated}
              />
            )}
          </div>

          <div className="divider divider-horizontal" />

          {/* Right column — Price summary */}
          <div className="flex min-h-0 flex-1 flex-col gap-4 py-4 pr-4">
            {order && !isLoading && (
              <OrderTimeline
                createdAt={order.created_at}
                paidAt={order.paid_at}
                deliveringAt={order.delivering_at ?? null}
                deliveredAt={order.delivered_at ?? null}
                cancelledAt={order.cancelled_at}
                cancelledNote={order.cancelled_note}
                refundedAt={order.refunded_at}
                status={order.status}
                updatedAt={order.updated_at}
              />
            )}
            {order && !isLoading && <OrderPriceSummary order={order} />}
          </div>
        </div>
      </div>
    </div>
  );
}
