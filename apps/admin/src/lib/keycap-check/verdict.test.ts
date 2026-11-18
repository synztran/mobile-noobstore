import { describe, expect, it } from "vitest";

import { buildVerdict, verdictDetail, verdictHeadline } from "./verdict";
import type { MatchResult, MatchedPair } from "./types";

function pair(index: number, distance = 0.05): MatchedPair {
  return {
    refId: `r${index}`,
    customerId: `c${index}`,
    distance,
  };
}

function result(partial: Partial<MatchResult> = {}): MatchResult {
  return {
    entries: [],
    matched: [],
    uncertain: [],
    missingIds: [],
    duplicateIds: [],
    extraIds: [],
    nearestRefByCustomer: {},
    distanceByCustomer: {},
    ...partial,
  };
}

describe("verdict", () => {
  it("reports 100% MATCH only when every key is paired and nothing is pending", () => {
    const verdict = buildVerdict(3, 3, result({ matched: [pair(1), pair(2), pair(3)] }));
    expect(verdict.status).toBe("match");
    expect(verdictHeadline(verdict)).toBe("100% MATCH");
    expect(verdictDetail(verdict)).toContain("3/3");
  });

  it("blocks 100% MATCH while a pair is still unconfirmed", () => {
    const verdict = buildVerdict(
      2,
      2,
      result({ matched: [pair(1)], uncertain: [pair(2, 0.28)] }),
    );
    expect(verdict.status).toBe("review");
    expect(verdict.uncertain).toBe(1);
    expect(verdictHeadline(verdict)).toBe("CẦN REVIEW");
  });

  it("counts a confirmed pair as matched", () => {
    const verdict = buildVerdict(
      2,
      2,
      result({ matched: [pair(1)], uncertain: [pair(2, 0.28)] }),
      { c2: "confirmed" },
    );
    expect(verdict.status).toBe("match");
    expect(verdict.confirmed).toBe(1);
    expect(verdict.matched).toBe(2);
  });

  it("turns a rejected pair into a missing key plus a duplicate", () => {
    const verdict = buildVerdict(
      2,
      2,
      result({ matched: [pair(1)], uncertain: [pair(2, 0.28)] }),
      { c2: "rejected" },
    );
    expect(verdict.status).toBe("incomplete");
    expect(verdict.missing).toBe(1);
    expect(verdict.duplicates).toBe(1);
    expect(verdict.rejected).toBe(1);
  });

  it("stays incomplete when a reference key has no pair", () => {
    const verdict = buildVerdict(
      3,
      2,
      result({ matched: [pair(1), pair(2)], missingIds: ["r3"] }),
    );
    expect(verdict.status).toBe("incomplete");
    expect(verdictDetail(verdict)).toContain("thiếu 1");
  });

  it("stays incomplete when the customer sent an extra key", () => {
    const verdict = buildVerdict(
      2,
      3,
      result({
        matched: [pair(1), pair(2)],
        duplicateIds: ["c3"],
      }),
    );
    expect(verdict.status).toBe("incomplete");
    expect(verdict.duplicates).toBe(1);
  });
});
