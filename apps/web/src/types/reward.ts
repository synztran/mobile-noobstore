export interface RewardItem {
  id: string;
  name: string;
  description: string | null;
  rewardType: "voucher" | "product" | "point";
  pointsCost: number;
  pointsCurrency?: "nsp" | "daily_checkin";
  imageUrl: string | null;
  stock: number | null;
  claimedCount: number;
  metadata: Record<string, unknown>;
}

export interface VoucherRewardMeta {
  amountOff: number | null;
  percentOff: number | null;
  maxDiscountAmount: number | null;
  minOrderAmount: number;
  scopeType: string;
  rewardType: string;
}

export interface RedeemResponse {
  success: boolean;
  rewardType: "voucher" | "product" | "point";
  voucherCode?: string;
  voucherName?: string;
  pointAmount?: number;
  productRef?: string;
  pointsSpent: number;
  newBalance: number;
  benefit: string;
}

export interface RewardsResponse {
  rewards: RewardItem[];
  total: number;
  hasMore: boolean;
}

export interface RewardClaim {
  id: string;
  rewardItemId: string;
  rewardName: string;
  rewardType: "voucher" | "product" | "point";
  pointsSpent: number;
  voucherCode: string | null;
  pointAmount: number | null;
  productRef: string | null;
  benefit: string;
  createdAt: string;
}
