import { describe, expect, it } from "vitest";
import { countAvailableMethods, getDeliveryAvailability } from "./delivery-availability";

function make(day: number, h: number, m: number) {
  const base = new Date(2026, 7, 9); // Aug 9, 2026 == Sunday (getDay 0)
  const d = new Date(base);
  d.setDate(base.getDate() + day);
  d.setHours(h, m, 0, 0);
  return d;
}

function byId(now: Date, opts?: Parameters<typeof getDeliveryAvailability>[1]) {
  return Object.fromEntries(
    getDeliveryAvailability(now, opts).map((m) => [m.id, m])
  );
}

describe("getDeliveryAvailability (day-aware hours)", () => {
  it("weekday open: express, standard, pickup all available", () => {
    const m = byId(make(1, 11, 0));
    expect(m.standard.available).toBe(true);
    expect(m.express.available).toBe(true);
    expect(m.pickup.available).toBe(true);
  });

  it("Saturday open: all methods available at 11:00", () => {
    const m = byId(make(6, 11, 0));
    expect(m.standard.available).toBe(true);
    expect(m.express.available).toBe(true);
    expect(m.pickup.available).toBe(true);
  });

  it("Saturday 16:00: express disabled (not enough time), standard & pickup available", () => {
    const m = byId(make(6, 16, 0));
    expect(m.express.available).toBe(false);
    expect(m.standard.available).toBe(true);
    expect(m.pickup.available).toBe(true);
  });

  it("Saturday 18:00 (after 17:00 close): all delivery disabled but carry next-open ETA", () => {
    const m = byId(make(6, 18, 0));
    expect(m.express.available).toBe(false);
    expect(m.standard.available).toBe(false);
    expect(m.pickup.available).toBe(false);
    expect(m.standard.eta).toContain("08:00");
  });

  it("countAvailableMethods matches available count", () => {
    const methods = getDeliveryAvailability(make(4, 12, 0));
    expect(countAvailableMethods(methods)).toBe(
      methods.filter((m) => m.available).length
    );
  });

  it("pre-order forces 'Sau khi có hàng' on every method", () => {
    const m = byId(make(2, 12, 0), { isPreOrder: true, preOrderEstimate: "2-3 tuần" });
    expect(m.express.available).toBe(true);
    expect(m.express.eta).toContain("Sau khi có hàng");
    expect(m.pickup.eta).toContain("2-3 tuần");
  });
});
