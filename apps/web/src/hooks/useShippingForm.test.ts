import { describe, expect, it } from "vitest";
import { isPickupSelectionValid } from "./useShippingForm";

describe("isPickupSelectionValid", () => {
  const now = new Date("2026-11-08T10:00:00");
  const base = {
    minDate: "2026-11-08",
    availableSlots: ["10:30", "11:00", "11:30"],
    now,
  };

  it("accepts a future slot on the current minimum date", () => {
    expect(
      isPickupSelectionValid({ ...base, date: "2026-11-08", time: "10:30" })
    ).toBe(true);
  });

  it("rejects a previously selected slot that has already passed today", () => {
    expect(
      isPickupSelectionValid({ ...base, date: "2026-11-08", time: "08:30" })
    ).toBe(false);
  });

  it("rejects a date before the current minimum date", () => {
    expect(
      isPickupSelectionValid({ ...base, date: "2026-11-07", time: "11:00" })
    ).toBe(false);
  });

  it("rejects a time that is not an available pickup slot", () => {
    expect(
      isPickupSelectionValid({ ...base, date: "2026-11-08", time: "20:30" })
    ).toBe(false);
  });
});
