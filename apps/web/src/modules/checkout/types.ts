import type { AppliedVoucherSummary } from "@/types/voucher";

export interface SubmitOrderRequestItem {
  product_id: string;
  variant_id?: string | null;
  product_name: string;
  thumbnail?: string | null;
  quantity: number;
  is_pre_order?: boolean;
  pre_order_config?: {
    estimate?: string;
    available_date?: string | null;
    notes?: string | null;
  } | null;
  components?: Array<{
    variant_id: string;
    variant_name: string;
    component_group: string;
    thumbnail: string | null;
    is_pre_order?: boolean;
    pre_order_config?: {
      estimate?: string;
      available_date?: string | null;
      notes?: string | null;
    } | null;
  }>;
}

export interface SubmitOrderRequest {
  idempotency_key: string;
  /**
   * Advisory only — the cart to convert is resolved server-side from the
   * session (see the conversion block below). The client sends whatever its
   * persisted cart store holds, so this is null or stale on a cold load; the
   * route only logs a warning when it disagrees with the active cart.
   */
  cart_id?: string | null;
  shipping_cost: number;
  payment_type?: "full" | "deposit_cod";
  deposit_percentage?: number;
  items: SubmitOrderRequestItem[];
  service_ids?: string[];
  shipping_method_id?: string | null;
  pickup_at?: string | null;
  delivery_address?: {
    full_name: string;
    phone_number: string;
    street_address?: string;
    apartment?: string | null;
    city?: string;
    district?: string;
    ward?: string;
    // Nullable: the summary page sends `|| null` for codes the customer never
    // filled in, and the value is persisted as-is.
    district_code?: string | null;
    ward_code?: string | null;
    postal_code?: string | null;
    notes?: string | null;
  } | null;
  vouchers?: {
    voucher_id?: string | null;
    voucher_code?: string | null;
    voucher_discount_amount?: number;
    shipping_discount_amount?: number;
    voucher_snapshot?: AppliedVoucherSummary | null;
    gift_items_snapshot?: Array<{
      product_id: string;
      variant_id: string | null;
      quantity: number;
    }> | null;
  }[];
  rank_discount?: {
    discount_amount: number;
    free_shipping: boolean;
    isShippingReward?: boolean;
    rank_name: string;
  };
}

export interface SubmitOrderResponse {
  order_id: string;
  order_number: string;
  status: string;
}
