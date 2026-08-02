import { describe, expect, it } from "vitest";
import { randomBase36, randomFloat, randomHex } from "./random";

describe("random helpers (CSPRNG)", () => {
  it("randomFloat stays in [0, 1)", () => {
    for (let i = 0; i < 2000; i++) {
      const v = randomFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it("randomFloat is not trivially constant", () => {
    const samples = new Set<number>();
    for (let i = 0; i < 50; i++) samples.add(randomFloat());
    expect(samples.size).toBeGreaterThan(40);
  });

  it("randomBase36 returns the requested length with base36 charset", () => {
    const re = /^[0-9A-Z]{6}$/;
    for (let i = 0; i < 2000; i++) {
      const s = randomBase36(6);
      expect(s).toMatch(re);
    }
  });

  it("randomBase36 does not trivially collide", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) seen.add(randomBase36(6));
    // 36^6 = 2.1B space; 10k draws should collisions ~0 after birthday calc cost,
    // so asserting a large unique set guards against a degenerate RNG.
    expect(seen.size).toBeGreaterThan(9900);
  });

  it("randomHex returns 2x byteLength hex chars", () => {
    expect(randomHex(0)).toBe("");
    expect(randomHex(4)).toMatch(/^[0-9a-f]{8}$/);
    expect(randomHex(16)).toMatch(/^[0-9a-f]{32}$/);
  });
});