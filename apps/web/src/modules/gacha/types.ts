// ─── Gacha domain contract types ─────────────────────────────────────────────
// Single home for all gacha types used across server, client, and UI.
// Formerly src/types/gacha.ts + the mission helper types in lib/gacha/missions.ts.

export interface GachaEvent {
  id: number;
  name: string;
  description?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  free_tokens_per_grant?: number | null;
  free_token_interval_days?: number | null;
  is_active?: boolean | null;
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
  rewardType: string;
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

// ─── Mission trigger helpers ─────────────────────────────────────────────────
// Must match the mission_type column values in gacha_missions table

export type MissionType =
  | "login_count"
  | "order_count"
  | "spend_amount"
  | "play_count";

export interface TriggerResult {
  completed: Array<{ mission_id: number; newly_completed: boolean }>;
}

// Result row shape returned by the process_mission_progress RPC
export interface MissionProgressRow {
  r_mission_id: number;
  r_newly_completed: boolean;
}