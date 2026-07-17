export interface CustomerRank {
  id: string;
  name: string;
  slug: string;
  level: number;
  color: string;
  iconUrl: string | null;
  iconLabel: string | null;
  minTotalSpent: number;
  minOrderCount: number;
  benefits: RankBenefits;
}

export interface RankBenefits {
  pointsMultiplier: number;
  discountPercent: number;
  freeShipping: boolean;
  exclusiveVoucherFrequency: string;
  prioritySupport: boolean;
  flags: {
    pointsMultiplierEnabled: boolean;
    discountPercentEnabled: boolean;
    freeShippingEnabled: boolean;
    exclusiveVoucherEnabled: boolean;
    prioritySupportEnabled: boolean;
  };
}

export interface RankProgress {
  totalSpent: number;
  orderCount: number;
  nextSpentThreshold: number | null;
  nextOrderThreshold: number | null;
}

export interface RankResponse {
  currentRank: CustomerRank | null;
  nextRank: CustomerRank | null;
  progress: RankProgress;
  allRanks: CustomerRank[];
}
