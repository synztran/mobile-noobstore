import type { MatchResult, ReviewMap, Verdict } from "./types";

/**
 * Fold the automatic match result and staff decisions into a single verdict.
 *
 * `100% MATCH` is only reported when every reference key is paired with exactly
 * one customer key, nothing is missing/duplicated/extra, and every uncertain
 * pair has been confirmed by staff. Anything else stays honest: an incomplete
 * verdict lists the counts, a review verdict means staff still has to decide.
 */
export function buildVerdict(
  totalReference: number,
  totalDetected: number,
  match: MatchResult,
  reviews: ReviewMap = {},
): Verdict {
  let matched = match.matched.length;
  let missing = match.missingIds.length;
  let duplicates = match.duplicateIds.length;
  let extras = match.extraIds.length;
  let uncertain = 0;
  let confirmed = 0;
  let rejected = 0;

  for (const pair of match.uncertain) {
    const decision = reviews[pair.customerId];
    if (decision === "confirmed") {
      matched += 1;
      confirmed += 1;
    } else if (decision === "rejected") {
      rejected += 1;
      missing += 1;
      duplicates += 1;
    } else {
      uncertain += 1;
    }
  }

  const hasProblem = missing > 0 || duplicates > 0 || extras > 0;
  const countsAgree = matched === totalReference && totalDetected === totalReference;

  let status: Verdict["status"];
  if (!hasProblem && uncertain === 0 && countsAgree) {
    status = "match";
  } else if (hasProblem) {
    status = "incomplete";
  } else {
    status = "review";
  }

  return {
    status,
    totalReference,
    totalDetected,
    matched,
    missing,
    duplicates,
    extras,
    uncertain,
    confirmed,
    rejected,
  };
}

export function verdictHeadline(verdict: Verdict): string {
  if (verdict.status === "match") return "100% MATCH";
  if (verdict.status === "review") return "CẦN REVIEW";
  return "CHƯA ĐỦ";
}

export function verdictDetail(verdict: Verdict): string {
  if (verdict.status === "match") {
    return `Đủ ${verdict.totalReference}/${verdict.totalReference} key, không thiếu, không trùng.`;
  }
  if (verdict.status === "review") {
    return `Còn ${verdict.uncertain} cặp cần staff xác nhận trước khi kết luận.`;
  }
  const parts: string[] = [];
  if (verdict.missing > 0) parts.push(`thiếu ${verdict.missing}`);
  if (verdict.duplicates > 0) parts.push(`trùng ${verdict.duplicates}`);
  if (verdict.extras > 0) parts.push(`dư/lạ ${verdict.extras}`);
  if (verdict.uncertain > 0) parts.push(`${verdict.uncertain} cặp nghi ngờ`);
  return `${parts.join(" · ")}.`;
}
