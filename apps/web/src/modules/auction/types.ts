import type { AuctionProductDetails } from "./product-details";

export type AuctionStatus = "draft" | "active" | "ended" | "cancelled";
export type BidIncrementType = "fixed" | "percentage";

export interface AuctionProductItem {
  id: string;
  product_id: string;
  starting_price: number;
  bin_price: number | null;
  increment_type: BidIncrementType;
  increment_value: number;
  current_price: number;
  current_winner_id: string | null;
  status: AuctionStatus;
  is_featured: boolean;
  required_customer_level: number;
  required_order_count: number;
  limit_bids_per_user: boolean;
  max_bids_per_user: number | null;
  starts_at: string;
  ends_at: string;
  anti_snipe_minutes: number;
  winner_checkout_hours: number;
  max_winner_cascades: number;
  winner_deadline: string | null;
  order_id: string | null;
  created_at: string;
  updated_at: string;
  product_details?: AuctionProductDetails | null;
  product?: {
    id: string;
    name: string;
    slug: string;
    thumbnail: string | null;
    base_price: number;
    brand: string | null;
    description: string | null;
    images?: string[] | null;
    // Product/variant gallery only; inspection photos live in product_details.condition.images.
    attributes?: Record<string, any> | null;
    variants?: Array<{
      id: string;
      variant_name: string;
      attributes?: Record<string, any> | null;
      stock_quantity?: number | null;
      thumbnail?: string | null;
    }> | null;
  } | null;
  total_bids?: number;
  unique_bidders?: number;
}

export interface AuctionBidItem {
  id: string;
  auction_id: string;
  user_id: string;
  amount: number;
  is_winning: boolean;
  cascade_skip_at: string | null;
  created_at: string;
  bidder_display?: string;
  is_current_user?: boolean;
}

export interface AuctionEligibility {
  can_bid: boolean;
  code?: string;
  message?: string;
  user_level: number;
  required_level: number;
  user_orders: number;
  required_orders: number;
  bids_placed: number;
  max_bids: number | null;
  is_winning: boolean;
  min_next_bid: number;
}

export interface PlaceBidRequest {
  amount: number;
}

export interface PlaceBidResponse {
  success: boolean;
  bid_id?: string;
  amount?: number;
  ends_at?: string;
  is_extended?: boolean;
  status?: AuctionStatus;
  error?: string;
  code?: string;
}

export interface BuyNowResponse {
  success: boolean;
  bid_id?: string;
  amount?: number;
  winner_deadline?: string;
  status?: AuctionStatus;
  error?: string;
  code?: string;
}

export interface AuctionDetailResponse {
  auction: AuctionProductItem;
  bids: AuctionBidItem[];
  eligibility?: AuctionEligibility;
}

export interface UserBidHistoryItem {
  bid_id: string;
  amount: number;
  created_at: string;
  is_winning: boolean;
  cascade_skip_at: string | null;
  auction: {
    id: string;
    product_id: string;
    product_name: string;
    product_slug: string;
    thumbnail: string | null;
    current_price: number;
    status: AuctionStatus;
    ends_at: string;
    winner_deadline: string | null;
    is_winner: boolean;
    can_checkout: boolean;
    order_id: string | null;
  };
}
