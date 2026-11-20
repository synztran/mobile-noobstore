/**
 * Contract types for the orders domain.
 * Single source of truth — never export order types from API route files.
 * Import from here in components, hooks, and API routes alike.
 */

// ---------------------------------------------------------------------------
// Order list types (from /api/user/orders)
// ---------------------------------------------------------------------------

export interface OrderSummaryProduct {
  id?: string;
  product_id?: string | null;
  product_slug?: string | null;
  name: string;
  variant: string | null;
  quantity: number;
  thumbnail: string | null;
  has_reviewed?: boolean;
  reviewed_rating?: number | null;
  reviewed_comment?: string | null;
}

export interface OrderSummary {
  id: string;
  order_number: string;
  status: string;
  total_price: number;
  item_count: number;
  service_line_count: number;
  product_summaries: OrderSummaryProduct[];
  created_at: string;
  voucher_code: string | null;
  voucher_discount_amount: number;
  shipping_discount_amount: number;
  has_reviewed?: boolean;
  /** NSP points earned for this order (only set for delivered orders) */
  points_earned?: number;
}

export interface OrdersPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next_page: boolean;
  has_prev_page: boolean;
}

export interface OrdersResponse {
  orders: OrderSummary[];
  total: number;
  pagination: OrdersPagination;
  status_counts: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Order detail types (from /api/user/orders/[id])
// ---------------------------------------------------------------------------

export interface OrderItemComponentDetail {
  variant_id: string;
  variant_name: string;
  component_group: string;
  price_adjustment: number;
  thumbnail: string | null;
  is_pre_order: boolean;
}

export interface OrderItemDetail {
  id: string;
  product_id: string | null;
  product_slug?: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  thumbnail: string | null;
  components: OrderItemComponentDetail[];
  gifts?: Array<{
    gift_name: string;
    gift_thumbnail: string | null;
    quantity: number;
  }> | null;
  isPreOrder: boolean;
  preOrderConfig: any;
  preOrderTracking: unknown;
  has_reviewed?: boolean;
  reviewed_rating?: number | null;
  reviewed_comment?: string | null;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "first_paid"
  | "second_paid"
  | "delivering"
  | "delivered"
  | "returning"
  | "cancelled"
  | "refunded";

export interface OrderDetail {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_price: number;
  shipping_fee: number;
  payment_type: "full" | "deposit_cod";
  deposit_percentage: number | null;
  deposit_amount: number | null;
  remaining_amount: number | null;
  deposit_paid_at: string | null;
  voucher_code: string | null;
  voucher_discount_amount: number;
  shipping_discount_amount: number;
  voucher_snapshot: unknown | null;
  cancelled_at: string | null;
  cancelled_note: string | null;
  created_at: string | null;
  updated_at: string | null;
  paid_at: string | null;
  delivering_at: string | null;
  delivered_at: string | null;
  refunded_at: string | null;
  returning_at: string | null;
  returning_reason: string | null;
  expected_delivery_at: string | null;
  shipping_method_id: string | null;
  pickup_at: string | null;
  pickup_code_expires_at: string | null;
  pickup_verified_at: string | null;
  tracking_carrier_id: string | null;
  tracking_number: string | null;
  carriers: {
    id: string;
    name: string | null;
    logo: string | null;
    tracking_url_template: string | null;
  } | null;
  delivery_address: {
    full_name?: string | null;
    phone_number?: string | null;
    street_address?: string | null;
    apartment?: string | null;
    ward?: string | null;
    district?: string | null;
    city?: string | null;
    postal_code?: string | null;
    notes?: string | null;
  } | null;
  invoice_url: string | null;
  items: OrderItemDetail[];
  has_reviewed?: boolean;
}

// ---------------------------------------------------------------------------
// Query / filter types (from lib/react-query/router/order)
// ---------------------------------------------------------------------------

export interface OrderStatusResult {
  order_number?: string;
  order_id?: string;
  status: string;
  voucher_discount_amount: number;
  shipping_discount_amount: number;
  payment_type?: "full" | "deposit_cod";
  deposit_percentage?: number;
  deposit_amount?: number;
  remaining_amount?: number;
  deposit_paid_at?: string | null;
  paid_at?: string | null;
  notFound?: boolean;
}

export interface OrderListFilters {
  q: string;
  status: string;
  page: number;
  limit: number;
}
