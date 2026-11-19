export type CheckinDayState = "done" | "missed" | "today" | "future";

export interface CheckinCalendarDay {
  date: string;
  points: number;
  hasPoints: boolean;
  hasVoucher: boolean;
  state: CheckinDayState;
  event: null | { id: string; name: string; hasVoucher: boolean };
  voucherId?: string;
}

export interface CheckinCalendarResponse {
  enabled: boolean;
  month: string;
  availablePoints: number;
  earliestExpiry: string | null;
  days: CheckinCalendarDay[];
  weekdayPoints: number;
  weekendPoints: number;
}

export interface CheckinClaimResult {
  alreadyCheckedIn: boolean;
  localDate: string;
  pointsAwarded: number;
  balance: number;
  expiresAt: string | null;
  voucherId: string | null;
}

export interface CheckinReward {
  id: string;
  name: string;
  description: string | null;
  reward_type: string;
  points_cost: number;
  points_currency: "nsp" | "daily_checkin";
  stock: number | null;
  claimed_count: number;
  metadata: Record<string, unknown>;
}
