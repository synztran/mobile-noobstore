import { describe, expect, it } from "vitest";
import {
  dayEndMinutes,
  expressDelivery,
  hoursForDay,
  isOpenNow,
  pickupDelivery,
  standardDelivery,
} from "./store-hours";

// Helper: build a Date at a given day-of-week and HH:MM in local time.
function make(day: number, h: number, m: number) {
  // Sunday 2026-08-09 ... Saturday 2026-08-15 (arbitrary fixed week)
  const base = new Date(2026, 7, 9); // Aug 9, 2026 == Sunday (getDay 0)
  const d = new Date(base);
  d.setDate(base.getDate() + day);
  d.setHours(h, m, 0, 0);
  return d;
}

describe("hoursForDay / dayEndMinutes", () => {
  it("weekdays run 08:00–19:00", () => {
    expect(hoursForDay(1).startAt).toBe("08:00");
    expect(hoursForDay(1).endAt).toBe("19:00");
    expect(hoursForDay(5).endAt).toBe("19:00");
  });

  it("weekends run 08:00–17:00", () => {
    expect(hoursForDay(0).endAt).toBe("17:00");
    expect(hoursForDay(6).endAt).toBe("17:00");
  });

  it("dayEndMinutes reflects the weekend window", () => {
    expect(dayEndMinutes(1)).toBe(19 * 60); // Mon
    expect(dayEndMinutes(6)).toBe(17 * 60); // Sat
  });
});

describe("isOpenNow (day-aware)", () => {
  it("open mid-weekday", () => {
    expect(isOpenNow(make(1, 12, 0))).toBe(true);
  });
  it("closed after weekday close (19:00)", () => {
    expect(isOpenNow(make(1, 20, 0))).toBe(false);
  });
  it("open on a Saturday within weekend hours", () => {
    expect(isOpenNow(make(6, 10, 0))).toBe(true);
  });
  it("closed on a Saturday after 17:00", () => {
    expect(isOpenNow(make(6, 18, 0))).toBe(false);
  });
});

describe("expressDelivery", () => {
  it("available on a weekday morning", () => {
    expect(expressDelivery(make(2, 9, 0)).available).toBe(true);
  });
  it("available on a Saturday morning (weekend processing runs)", () => {
    expect(expressDelivery(make(6, 9, 0)).available).toBe(true);
  });
  it("disabled when fewer than 2h remain before weekday close", () => {
    expect(expressDelivery(make(2, 18, 0)).available).toBe(false);
  });
  it("disabled on a Sunday afternoon after weekend cutoff", () => {
    expect(expressDelivery(make(0, 16, 0)).available).toBe(false);
  });
});

describe("standardDelivery", () => {
  it("available during weekday hours", () => {
    expect(standardDelivery(make(3, 14, 0)).available).toBe(true);
  });
  it("unavailable outside hours", () => {
    expect(standardDelivery(make(3, 21, 0)).available).toBe(false);
  });
});

describe("pickupDelivery", () => {
  it("available on a Saturday within weekend window", () => {
    expect(pickupDelivery(make(6, 15, 0)).available).toBe(true);
  });
  it("unavailable after weekend close", () => {
    expect(pickupDelivery(make(6, 17, 30)).available).toBe(false);
  });
});
