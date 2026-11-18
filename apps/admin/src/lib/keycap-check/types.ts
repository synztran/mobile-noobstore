/**
 * Shared contracts for the keycap completeness checker.
 *
 * Everything in this module is plain data so it can be unit-tested in Node.
 * Browser-only helpers (canvas cropping, OpenCV loading) live in `crop.ts` and
 * `detect.ts`.
 */

export type KeycapSource = "customer" | "render";

/** A raw contour candidate produced by the OpenCV detector. */
export interface RawCandidate {
  x: number;
  y: number;
  w: number;
  h: number;
  /** filled contour area in source pixels */
  area: number;
}

/** One detected (or manually added) keycap. */
export interface DetectedKey extends RawCandidate {
  id: string;
  source: KeycapSource;
  /** index into the customer upload list; always 0 for the render */
  imageIndex: number;
  /** width expressed in keycap units (1u, 1.25u, 6.25u, …) */
  units: number;
  /** display label derived from `units` */
  sizeClass: string;
  /** true when staff added the box by hand */
  manual: boolean;
}

/**
 * Compact identity descriptor for a keycap crop.
 *
 * - `color`: normalised Lab colour histogram (4×4×4 = 64 bins)
 * - `legend`: mean-centred, L2-normalised grayscale signature (16×16)
 * - `energy`: standard deviation of the grayscale crop; near zero means a
 *   blank keycap with no legend to compare
 * - `aspect`: crop long/short ratio, used as a weak shape signal
 */
export interface KeycapDescriptor {
  color: Float32Array;
  legend: Float32Array;
  energy: number;
  aspect: number;
}

export type MatchStatus =
  | "matched"
  | "uncertain"
  | "missing"
  | "duplicate"
  | "extra";

export interface MatchedPair {
  refId: string;
  customerId: string;
  distance: number;
}

export interface MatchEntry {
  refId: string | null;
  customerId: string | null;
  distance: number;
  status: MatchStatus;
  /** for duplicates: the reference key the extra customer key resembles */
  nearestRefId: string | null;
}

export interface MatchResult {
  entries: MatchEntry[];
  matched: MatchedPair[];
  uncertain: MatchedPair[];
  missingIds: string[];
  duplicateIds: string[];
  extraIds: string[];
  /** nearest reference key for every customer key, used by the review UI */
  nearestRefByCustomer: Record<string, string>;
  distanceByCustomer: Record<string, number>;
}

export type ReviewDecision = "confirmed" | "rejected";

/** customer key id → staff decision */
export type ReviewMap = Record<string, ReviewDecision>;

export type VerdictStatus = "match" | "incomplete" | "review";

export interface Verdict {
  status: VerdictStatus;
  totalReference: number;
  totalDetected: number;
  matched: number;
  missing: number;
  duplicates: number;
  extras: number;
  uncertain: number;
  confirmed: number;
  rejected: number;
}
