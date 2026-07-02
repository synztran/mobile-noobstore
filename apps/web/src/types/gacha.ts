export interface GachaEvent {
  id: number;
  name: string;
}

export interface GachaRewardMeta {
  id: number;
  reward_type: "product" | "point" | "puzzle" | "lucky_text";
  name: string;
  description: string | null;
  value: string | null;
  thumbnail_url: string | null;
  is_golden: boolean;
  weight: number;
  max_quantity: number | null;
  claimed_count: number;
  percent: number;
  percent_display: number;
}

export interface GachaEventResponse {
  event: GachaEvent | null;
  rewards: GachaRewardMeta[];
  token_count: number;
}

export interface HistoryReward {
  id: number;
  reward_type: string;
  name: string;
  description: string | null;
  value: string | null;
  thumbnail_url: string | null;
  is_golden: boolean;
}

export interface HistoryEntry {
  id: number;
  played_at: string;
  reward: HistoryReward | null;
}

export interface GachaHistoryPage {
  history: HistoryEntry[];
  hasMore: boolean;
}

export interface GachaMission {
  id: number;
  name: string;
  description: string | null;
  mission_type: string;
  requirement: {
    amount?: number;
    count?: number;
  };
  token_reward: number;
  show_trigger: boolean;
  progress: number | null;
  completed_at: string | null;
  claimed_at: string | null;
}

export interface Winner {
  displayName: string;
  rewardName: string;
  isGolden: boolean;
}

export interface GachaRewardData {
  id: number;
  reward_type: "product" | "point" | "puzzle" | "lucky_text";
  name: string;
  description: string | null;
  value: string | null;
  thumbnail_url: string | null;
  is_golden: boolean;
}

export type Phase =
  | "idle"
  | "token-inserted"
  | "dispensing"
  | "rolling"
  | "reveal";
