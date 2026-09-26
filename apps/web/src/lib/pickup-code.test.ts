import { describe, expect, it } from "vitest";
import {
  MAX_PICKUP_CODE_TRIES,
  generatePickupCode,
  hashPickupCode,
  isPickupCodeExpired,
  isPickupCodeLocked,
  pickupCodeLockSecondsLeft,
  pickupCodeSecondsLeft,
} from "./pickup-code";

describe("pickup-code helpers", () => {
  it("generates 6 numeric digits", () => {
    for (let i = 0; i < 2000; i++) {
      expect(generatePickupCode()).toMatch(/^\d{6}$/);
    }
  });

  it("generates codes that are not trivially constant", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) seen.add(generatePickupCode());
    expect(seen.size).toBeGreaterThan(9900);
  });

  it("hashes to a 64-char sha256 hex digest", () => {
    expect(hashPickupCode("123456")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashPickupCode("000000")).not.toBe(hashPickupCode("123456"));
  });

  it("expiry checks handle null and boundaries", () => {
    expect(isPickupCodeExpired(null)).toBe(true);
    expect(isPickupCodeExpired(new Date(Date.now() + 1000).toISOString(), Date.now())).toBe(false);
    expect(isPickupCodeExpired(new Date(Date.now() - 1).toISOString(), Date.now())).toBe(true);
  });

  it("lock checks handle null and boundaries", () => {
    expect(isPickupCodeLocked(null)).toBe(false);
    expect(isPickupCodeLocked(new Date(Date.now() + 1000).toISOString(), Date.now())).toBe(true);
    expect(isPickupCodeLocked(new Date(Date.now() - 1).toISOString(), Date.now())).toBe(false);
  });

  it("seconds-left helpers floor at 0", () => {
    expect(pickupCodeSecondsLeft(null)).toBe(0);
    expect(pickupCodeSecondsLeft(new Date(Date.now() + 4000).toISOString(), Date.now())).toBe(4);
    expect(pickupCodeSecondsLeft(new Date(Date.now() - 50).toISOString(), Date.now())).toBe(0);
    expect(pickupCodeLockSecondsLeft(null)).toBe(0);
    expect(
      pickupCodeLockSecondsLeft(new Date(Date.now() + 6000).toISOString(), Date.now()),
    ).toBe(6);
  });

  it("guards the max trips constant", () => {
    expect(MAX_PICKUP_CODE_TRIES).toBe(5);
  });
});