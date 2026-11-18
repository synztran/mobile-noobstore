import type { DetectedKey } from "./types";
import { median, medianSquareShortEdge } from "./geometry";

/**
 * Common GMK keycap widths, in units. The detector measures pixels, so we map
 * each measured long edge onto the nearest entry of this ladder.
 */
export const SIZE_LADDER = [
  1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 6, 6.25, 7,
] as const;

/** How far a measured ratio may sit from a ladder entry before it is kept raw. */
const LADDER_TOLERANCE = 0.16;

/**
 * Estimate the pixel length of 1u from square-ish keycaps. Spacebars and other
 * wide keys are deliberately excluded so they cannot drag the median upward.
 */
export function estimateBaseUnit(
  items: { w: number; h: number }[],
  fallback = 1,
): number {
  const squareMedian = medianSquareShortEdge(items);
  if (squareMedian > 0) return squareMedian;

  const shorts = items
    .map((item) => Math.min(item.w, item.h))
    .filter((value) => value > 0);
  const anyMedian = median(shorts);
  return anyMedian > 0 ? anyMedian : fallback;
}

/** Snap a measured long/short ratio to the keycap size ladder. */
export function snapUnits(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 1;

  let best: number = SIZE_LADDER[0];
  let bestDelta = Math.abs(raw - best);
  for (const step of SIZE_LADDER) {
    const delta = Math.abs(raw - step);
    if (delta < bestDelta) {
      best = step;
      bestDelta = delta;
    }
  }

  if (bestDelta <= LADDER_TOLERANCE) return best;
  // Off-ladder shapes (ISO Enter, artisan caps) keep a quarter-unit value so
  // they still group with each other instead of silently becoming 1u.
  return Math.max(1, Math.round(raw * 4) / 4);
}

export function unitsForBox(w: number, h: number, baseUnit: number): number {
  const long = Math.max(w, h);
  const base = baseUnit > 0 ? baseUnit : 1;
  return snapUnits(long / base);
}

export function sizeClassLabel(units: number): string {
  return `${Number(units.toFixed(2))}u`;
}

/**
 * Assign a size class to every key.
 *
 * Scale is estimated per uploaded image (a close-up photo has larger pixels
 * than a wide shot), then falls back to the whole group when an image has too
 * few square keys to be trustworthy.
 */
export function assignSizeClasses(
  keys: DetectedKey[],
  group: "customer" | "render",
): DetectedKey[] {
  if (keys.length === 0) return keys;

  const globalBase = estimateBaseUnit(keys, 1);
  const byImage = new Map<number, DetectedKey[]>();
  for (const key of keys) {
    const bucket = byImage.get(key.imageIndex);
    if (bucket) bucket.push(key);
    else byImage.set(key.imageIndex, [key]);
  }

  const baseByImage = new Map<number, number>();
  for (const [imageIndex, bucket] of byImage) {
    const squareCount = bucket.filter((key) => {
      const short = Math.min(key.w, key.h);
      const long = Math.max(key.w, key.h);
      return short > 0 && long / short < 1.4;
    }).length;
    const base =
      squareCount >= 6 ? estimateBaseUnit(bucket, globalBase) : globalBase;
    baseByImage.set(imageIndex, base > 0 ? base : 1);
  }

  return keys.map((key) => {
    const base = baseByImage.get(key.imageIndex) ?? globalBase;
    const units = unitsForBox(key.w, key.h, base);
    return {
      ...key,
      units,
      sizeClass: sizeClassLabel(units),
      source: group,
    };
  });
}

export function medianKeyShortEdge(keys: DetectedKey[]): number {
  const shorts = keys
    .map((key) => Math.min(key.w, key.h))
    .filter((value) => value > 0);
  return median(shorts);
}
