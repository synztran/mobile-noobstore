import { describe, expect, it } from "vitest";
import { advanceOrderAlertCursor, parseOrderAlertCursor } from "./order-alerts";

const id = "7dd9c07a-9d48-4270-bfd5-ec66b9fc4483";
describe("order alert cursors", () => {
  it("preserves database timestamp precision", () => {
    const cursor = { createdAt: "2026-10-23T10:00:00.123456+00:00", id };
    expect(parseOrderAlertCursor(JSON.stringify(cursor))).toEqual(cursor);
  });
  it.each(["no-json", "null", "{}", JSON.stringify({ createdAt: "bad", id }),
    JSON.stringify({ createdAt: "2026-10-23T10:00:00Z", id: "x),status.eq.paid" })])("rejects malformed cursor %s", raw => {
    expect(parseOrderAlertCursor(raw)).toBeNull();
  });
  it("advances to the last row, including ID for timestamp ties", () => {
    expect(advanceOrderAlertCursor([])).toBeNull();
    expect(advanceOrderAlertCursor([{ id, created_at: "2026-10-23T10:00:00Z", order_number: "ORD-1", total_price: 100 }]))
      .toEqual({ createdAt: "2026-10-23T10:00:00Z", id });
  });
});
