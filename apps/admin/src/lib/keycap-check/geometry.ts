import type { RawCandidate } from "./types";

export interface Point {
  x: number;
  y: number;
}

export interface BoxLike {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CandidateLike extends BoxLike {
  area: number;
}

export function boxCenter(box: BoxLike): Point {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

export function pointInside(point: Point, box: BoxLike): boolean {
  return (
    point.x >= box.x &&
    point.x <= box.x + box.w &&
    point.y >= box.y &&
    point.y <= box.y + box.h
  );
}

export function intersectionArea(a: BoxLike, b: BoxLike): number {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.w, b.x + b.w);
  const bottom = Math.min(a.y + a.h, b.y + b.h);
  if (right <= left || bottom <= top) return 0;
  return (right - left) * (bottom - top);
}

/** Intersection over union in the range 0..1. */
export function boxIou(a: BoxLike, b: BoxLike): number {
  const intersection = intersectionArea(a, b);
  if (intersection === 0) return 0;
  const union = a.w * a.h + b.w * b.h - intersection;
  return union <= 0 ? 0 : intersection / union;
}

/**
 * True when the centre of `small` sits inside `big`. Used to collapse the
 * nested contours a keycap produces (outer bevel + inner face + legend) while
 * keeping two adjacent keycaps apart.
 */
export function centerInside(small: BoxLike, big: BoxLike): boolean {
  const center = boxCenter(small);
  return pointInside(center, big);
}

/**
 * Collapse nested / heavily overlapping contour candidates.
 *
 * The detector sees each keycap several times: the outer bevel, the inner
 * face, sometimes a legend ring. Keep the largest box and drop any smaller box
 * whose centre lands inside it, or whose IoU is high. Candidates are returned
 * in reading order.
 */
export function dedupeCandidates<T extends CandidateLike>(items: T[]): T[] {
  const sorted = [...items].sort((a, b) => b.area - a.area);
  const kept: T[] = [];

  for (const item of sorted) {
    const duplicate = kept.some((other) => {
      if (boxIou(item, other) > 0.45) return true;
      const small = item.area <= other.area ? item : other;
      const big = item.area <= other.area ? other : item;
      if (big.area <= 0) return false;
      return small.area / big.area < 0.7 && centerInside(small, big);
    });
    if (!duplicate) kept.push(item);
  }

  return sortReadingOrder(kept);
}

/**
 * Sort boxes top-to-bottom, left-to-right, bucketing boxes whose vertical
 * centres are within half a median key height into the same row.
 */
export function sortReadingOrder<T extends BoxLike>(items: T[]): T[] {
  if (items.length < 2) return [...items];
  const heights = items.map((item) => item.h).sort((a, b) => a - b);
  const medianHeight = heights[Math.floor(heights.length / 2)] || 1;
  const rowTolerance = Math.max(6, medianHeight * 0.5);

  return [...items].sort((a, b) => {
    const ay = a.y + a.h / 2;
    const by = b.y + b.h / 2;
    if (Math.abs(ay - by) > rowTolerance) return ay - by;
    return a.x - b.x;
  });
}

/**
 * Order four quad corners as top-left, top-right, bottom-right, bottom-left.
 *
 * The classic sum/difference trick tolerates moderate perspective because the
 * extreme sums always belong to opposite corners.
 */
export function orderQuad(points: Point[]): [Point, Point, Point, Point] {
  if (points.length !== 4) {
    throw new Error(`orderQuad expects 4 points, received ${points.length}`);
  }

  let topLeft = points[0];
  let bottomRight = points[0];
  let topRight = points[0];
  let bottomLeft = points[0];

  for (const point of points) {
    if (point.x + point.y < topLeft.x + topLeft.y) topLeft = point;
    if (point.x + point.y > bottomRight.x + bottomRight.y) bottomRight = point;
    if (point.x - point.y > topRight.x - topRight.y) topRight = point;
    if (point.x - point.y < bottomLeft.x - bottomLeft.y) bottomLeft = point;
  }

  return [topLeft, topRight, bottomRight, bottomLeft];
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Median short edge of the square-ish candidates, used as the 1u ruler. */
export function medianSquareShortEdge(
  items: { w: number; h: number }[],
): number {
  const square = items
    .filter((item) => {
      const short = Math.min(item.w, item.h);
      const long = Math.max(item.w, item.h);
      return short > 0 && long / short < 1.4;
    })
    .map((item) => Math.min(item.w, item.h))
    .sort((a, b) => a - b);

  if (square.length === 0) return 0;
  return square[Math.floor(square.length / 2)];
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** Convert raw candidates into boxes clamped to the image bounds. */
export function clampCandidates(
  items: RawCandidate[],
  width: number,
  height: number,
): RawCandidate[] {
  return items
    .map((item) => {
      const x = Math.max(0, Math.min(width, item.x));
      const y = Math.max(0, Math.min(height, item.y));
      const w = Math.max(0, Math.min(width - x, item.w));
      const h = Math.max(0, Math.min(height - y, item.h));
      return { ...item, x, y, w, h, area: Math.min(item.area, w * h) };
    })
    .filter((item) => item.w > 0 && item.h > 0);
}
