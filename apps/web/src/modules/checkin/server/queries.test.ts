import { describe, expect, it } from "vitest";
import { getCheckinCalendar } from "./queries";

function chain(data: unknown) {
  const result = { data, error: null };
  const q: any = {
    select: () => q,
    eq: () => q,
    gte: () => q,
    lte: () => q,
    gt: () => q,
    order: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return q;
}

describe("getCheckinCalendar", () => {
  it("resolves weekday/weekend and explicit event point overrides", async () => {
    const db: any = {
      from(table: string) {
        if (table === "checkin_settings") return chain({ enabled: true, weekday_points: 1, weekend_points: 2, holiday_weekday_points: 3, holiday_weekend_points: 4 });
        if (table === "checkin_events") return chain([{ id: "ev", event_date: "2026-11-20", name: "Special", weekday_points: 5, weekend_points: null, voucher_batch_id: null }]);
        if (table === "checkin_records") return chain([]);
        return chain([{ remaining_amount: 7, expires_at: "2099-12-31T16:59:59Z" }]);
      },
    };
    const result = await getCheckinCalendar(db, "user", "2026-11");
    expect(result.days).toHaveLength(30);
    expect(result.days.find((day) => day.date === "2026-11-20")?.points).toBe(5);
    expect(result.days.find((day) => day.date === "2026-11-21")?.points).toBe(2);
    expect(result.availablePoints).toBe(7);
  });

  it("rejects malformed month input", async () => {
    await expect(getCheckinCalendar({} as any, "u", "2026-13")).rejects.toThrow("invalid_month");
  });
});
