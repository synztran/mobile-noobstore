import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CheckinCalendarResponse,
  CheckinClaimResult,
  CheckinDayState,
  CheckinReward,
} from "../types";

type Db = SupabaseClient<any>;

function monthRange(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("invalid_month");
  const [year, rawMonth] = month.split("-").map(Number);
  if (rawMonth < 1 || rawMonth > 12) throw new Error("invalid_month");
  const first = `${month}-01`;
  const lastDate = new Date(Date.UTC(year, rawMonth, 0)).getUTCDate();
  return {
    first,
    last: `${month}-${String(lastDate).padStart(2, "0")}`,
    lastDate,
  };
}

function localToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function getCheckinCalendar(
  db: Db,
  userId: string,
  month: string
): Promise<CheckinCalendarResponse> {
  const range = monthRange(month);
  const raw = db as any;
  const [
    { data: settings, error: settingsError },
    { data: events, error: eventsError },
    { data: records, error: recordsError },
    { data: lots, error: lotsError },
  ] = await Promise.all([
    raw
      .from("checkin_settings")
      .select(
        "enabled,weekday_points,weekend_points,holiday_weekday_points,holiday_weekend_points"
      )
      .eq("id", true)
      .single(),
    raw
      .from("checkin_events")
      .select(
        "id,event_date,name,weekday_points,weekend_points,voucher_batch_id"
      )
      .eq("enabled", true)
      .gte("event_date", range.first)
      .lte("event_date", range.last),
    raw
      .from("checkin_records")
      .select("local_date,voucher_id")
      .eq("user_id", userId)
      .gte("local_date", range.first)
      .lte("local_date", range.last),
    raw
      .from("checkin_point_lots")
      .select("remaining_amount,expires_at")
      .eq("user_id", userId)
      .gt("remaining_amount", 0)
      .gt("expires_at", new Date().toISOString())
      .order("expires_at"),
  ]);
  const err = settingsError ?? eventsError ?? recordsError ?? lotsError;
  if (err) throw new Error(err.message);
  if (!settings) throw new Error("checkin_settings_missing");
  const today = localToday();
  const eventByDate = new Map(
    (events ?? []).map((event: any) => [event.event_date, event])
  );
  const recordByDate = new Map(
    (records ?? []).map((record: any) => [record.local_date, record])
  );
  const days = Array.from({ length: range.lastDate }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, "0")}`;
    const [year, monthNumber, dayNumber] = date.split("-").map(Number);
    const dow = new Date(
      Date.UTC(year, monthNumber - 1, dayNumber)
    ).getUTCDay();
    const weekend = dow === 0 || dow === 6;
    const event: any = eventByDate.get(date);
    const record: any = recordByDate.get(date);
    const state: CheckinDayState = record
      ? "done"
      : date === today
        ? "today"
        : date < today
          ? "missed"
          : "future";
    return {
      date,
      points: event
        ? ((weekend ? event.weekend_points : event.weekday_points) ??
          (weekend
            ? settings.holiday_weekend_points
            : settings.holiday_weekday_points))
        : weekend
          ? settings.weekend_points
          : settings.weekday_points,
      hasPoints:
        Number(
          event
            ? ((weekend ? event.weekend_points : event.weekday_points) ??
                (weekend
                  ? settings.holiday_weekend_points
                  : settings.holiday_weekday_points))
            : weekend
              ? settings.weekend_points
              : settings.weekday_points
        ) > 0,
      hasVoucher: Boolean(event?.voucher_batch_id),
      state,
      event:
        event && date === today
          ? {
              id: event.id,
              name: event.name,
              hasVoucher: Boolean(event.voucher_batch_id),
            }
          : null,
      ...(record?.voucher_id ? { voucherId: record.voucher_id } : {}),
    };
  });
  const availablePoints = (lots ?? []).reduce(
    (sum: number, lot: any) => sum + lot.remaining_amount,
    0
  );
  const earliestExpiry =
    (lots ?? []).find((lot: any) => lot.remaining_amount > 0)?.expires_at ??
    null;
  return {
    enabled: settings.enabled,
    month,
    availablePoints,
    earliestExpiry,
    days,
    weekdayPoints: Number(settings.weekday_points ?? 1),
    weekendPoints: Number(settings.weekend_points ?? 2),
  };
}

export async function claimCheckinToday(
  db: Db,
  userId: string
): Promise<CheckinClaimResult> {
  const { data, error } = await db.rpc("claim_daily_checkin", {
    p_user_id: userId,
  });
  if (error) {
    if (error.message.includes("checkin_disabled"))
      throw new Error("checkin_disabled");
    throw new Error(error.message);
  }
  const row = data as Record<string, unknown>;
  return {
    alreadyCheckedIn: Boolean(row.already_checked_in),
    localDate: String(row.local_date),
    pointsAwarded: Number(row.points_awarded ?? 0),
    balance: Number(row.balance ?? 0),
    expiresAt: (row.expires_at as string | null) ?? null,
    voucherId: (row.voucher_id as string | null) ?? null,
  };
}

export async function getCheckinRewards(db: Db): Promise<CheckinReward[]> {
  const { data, error } = await (db as any)
    .from("reward_items")
    .select(
      "id,name,description,reward_type,points_cost,points_currency,stock,claimed_count,metadata"
    )
    .eq("is_active", true)
    .eq("points_currency", "daily_checkin")
    .order("points_cost")
    .limit(6);
  if (error) throw new Error(error.message);
  return data ?? [];
}
