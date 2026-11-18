import type {
  DetectedKey,
  KeycapDescriptor,
  MatchEntry,
  MatchResult,
  MatchStatus,
  MatchedPair,
} from "./types";
import { descriptorDistance } from "./descriptor";

/**
 * Below this distance a pair is auto-matched. Between MATCH and UNCERTAIN the
 * pair is shown to staff for confirmation; above UNCERTAIN it is treated as a
 * different key.
 */
export const MATCH_THRESHOLD = 0.2;
export const UNCERTAIN_THRESHOLD = 0.36;

/** Cost used to forbid a pairing (different size class / missing descriptor). */
export const COST_BLOCK = 1e6;

/** Two size classes may pair when their measured widths are this close. */
export const UNIT_TOLERANCE = 0.13;

export interface MatchOptions {
  matchThreshold?: number;
  uncertainThreshold?: number;
}

function unitsCompatible(a: DetectedKey, b: DetectedKey): boolean {
  const ua = a.units > 0 ? a.units : 1;
  const ub = b.units > 0 ? b.units : 1;
  return Math.abs(ua - ub) <= UNIT_TOLERANCE;
}

/**
 * Hungarian assignment (Kuhn–Munkres with potentials), O(n³).
 *
 * Returns, for each row, the assigned column or -1. Rows/columns are padded to
 * a square matrix with COST_BLOCK so rectangular problems work unchanged.
 */
export function hungarian(cost: number[][]): number[] {
  const rows = cost.length;
  if (rows === 0) return [];
  const cols = cost[0]?.length ?? 0;
  if (cols === 0) return new Array(rows).fill(-1);

  const size = Math.max(rows, cols);
  const a: number[][] = Array.from({ length: size + 1 }, () =>
    new Array<number>(size + 1).fill(0),
  );

  for (let i = 1; i <= size; i += 1) {
    for (let j = 1; j <= size; j += 1) {
      a[i][j] =
        i <= rows && j <= cols ? cost[i - 1][j - 1] : COST_BLOCK;
    }
  }

  const u = new Array<number>(size + 1).fill(0);
  const v = new Array<number>(size + 1).fill(0);
  const p = new Array<number>(size + 1).fill(0);
  const way = new Array<number>(size + 1).fill(0);

  for (let i = 1; i <= size; i += 1) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array<number>(size + 1).fill(Number.POSITIVE_INFINITY);
    const used = new Array<boolean>(size + 1).fill(false);

    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Number.POSITIVE_INFINITY;
      let j1 = 0;

      for (let j = 1; j <= size; j += 1) {
        if (used[j]) continue;
        const current = a[i0][j] - u[i0] - v[j];
        if (current < minv[j]) {
          minv[j] = current;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }

      for (let j = 0; j <= size; j += 1) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);

    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  const assignment = new Array<number>(rows).fill(-1);
  for (let j = 1; j <= size; j += 1) {
    const row = p[j];
    if (row >= 1 && row <= rows && j <= cols) {
      assignment[row - 1] = j - 1;
    }
  }
  return assignment;
}

export function buildCostMatrix(
  refs: DetectedKey[],
  customers: DetectedKey[],
  refDescriptors: Map<string, KeycapDescriptor>,
  customerDescriptors: Map<string, KeycapDescriptor>,
): number[][] {
  return refs.map((ref) => {
    const refDescriptor = refDescriptors.get(ref.id);
    return customers.map((customer) => {
      if (!unitsCompatible(ref, customer)) return COST_BLOCK;
      const customerDescriptor = customerDescriptors.get(customer.id);
      if (!refDescriptor || !customerDescriptor) return COST_BLOCK;
      return descriptorDistance(refDescriptor, customerDescriptor);
    });
  });
}

function nearestReference(
  customer: DetectedKey,
  refs: DetectedKey[],
  refDescriptors: Map<string, KeycapDescriptor>,
  customerDescriptors: Map<string, KeycapDescriptor>,
): { refId: string; distance: number } | null {
  const customerDescriptor = customerDescriptors.get(customer.id);
  if (!customerDescriptor) return null;

  let best: { refId: string; distance: number } | null = null;
  for (const ref of refs) {
    if (!unitsCompatible(ref, customer)) continue;
    const refDescriptor = refDescriptors.get(ref.id);
    if (!refDescriptor) continue;
    const distance = descriptorDistance(refDescriptor, customerDescriptor);
    if (!best || distance < best.distance) {
      best = { refId: ref.id, distance };
    }
  }
  return best;
}

/**
 * Match every reference key to at most one customer key and classify the rest.
 *
 * - reference matched, distance ≤ match → `matched`
 * - reference matched, distance ≤ uncertain → `uncertain` (staff confirms)
 * - reference unmatched → `missing`
 * - customer unmatched but close to an already-matched reference → `duplicate`
 * - customer unmatched and unlike anything → `extra`
 */
export function matchKeys(
  refs: DetectedKey[],
  customers: DetectedKey[],
  refDescriptors: Map<string, KeycapDescriptor>,
  customerDescriptors: Map<string, KeycapDescriptor>,
  options: MatchOptions = {},
): MatchResult {
  const matchThreshold = options.matchThreshold ?? MATCH_THRESHOLD;
  const uncertainThreshold = options.uncertainThreshold ?? UNCERTAIN_THRESHOLD;

  const cost = buildCostMatrix(refs, customers, refDescriptors, customerDescriptors);
  const assignment = hungarian(cost);

  const matched: MatchedPair[] = [];
  const uncertain: MatchedPair[] = [];
  const entries: MatchEntry[] = [];
  const missingIds: string[] = [];
  const duplicateIds: string[] = [];
  const extraIds: string[] = [];
  const nearestRefByCustomer: Record<string, string> = {};
  const distanceByCustomer: Record<string, number> = {};

  const assignedCustomers = new Set<number>();

  for (let i = 0; i < refs.length; i += 1) {
    const ref = refs[i];
    const customerIndex = assignment[i] ?? -1;
    const distance =
      customerIndex >= 0 ? cost[i][customerIndex] : Number.POSITIVE_INFINITY;

    if (
      customerIndex >= 0 &&
      distance < COST_BLOCK / 2 &&
      distance <= uncertainThreshold
    ) {
      const customer = customers[customerIndex];
      assignedCustomers.add(customerIndex);
      nearestRefByCustomer[customer.id] = ref.id;
      distanceByCustomer[customer.id] = distance;

      const pair: MatchedPair = {
        refId: ref.id,
        customerId: customer.id,
        distance,
      };

      if (distance <= matchThreshold) {
        matched.push(pair);
        entries.push({
          refId: ref.id,
          customerId: customer.id,
          distance,
          status: "matched",
          nearestRefId: ref.id,
        });
      } else {
        uncertain.push(pair);
        entries.push({
          refId: ref.id,
          customerId: customer.id,
          distance,
          status: "uncertain",
          nearestRefId: ref.id,
        });
      }
      continue;
    }

    missingIds.push(ref.id);
    entries.push({
      refId: ref.id,
      customerId: null,
      distance: Number.POSITIVE_INFINITY,
      status: "missing",
      nearestRefId: null,
    });
  }

  for (let j = 0; j < customers.length; j += 1) {
    if (assignedCustomers.has(j)) continue;
    const customer = customers[j];
    const nearest = nearestReference(
      customer,
      refs,
      refDescriptors,
      customerDescriptors,
    );

    if (nearest) {
      nearestRefByCustomer[customer.id] = nearest.refId;
      distanceByCustomer[customer.id] = nearest.distance;
    }

    const isDuplicate = nearest !== null && nearest.distance <= uncertainThreshold;
    if (isDuplicate) duplicateIds.push(customer.id);
    else extraIds.push(customer.id);

    entries.push({
      refId: null,
      customerId: customer.id,
      distance: nearest?.distance ?? Number.POSITIVE_INFINITY,
      status: isDuplicate ? "duplicate" : "extra",
      nearestRefId: nearest?.refId ?? null,
    });
  }

  return {
    entries,
    matched,
    uncertain,
    missingIds,
    duplicateIds,
    extraIds,
    nearestRefByCustomer,
    distanceByCustomer,
  };
}

/** Per-key status maps for the overlay canvases. */
export function buildStatusMaps(match: MatchResult): {
  byRef: Record<string, MatchStatus>;
  byCustomer: Record<string, MatchStatus>;
} {
  const byRef: Record<string, MatchStatus> = {};
  const byCustomer: Record<string, MatchStatus> = {};

  for (const pair of match.matched) {
    byRef[pair.refId] = "matched";
    byCustomer[pair.customerId] = "matched";
  }
  for (const pair of match.uncertain) {
    byRef[pair.refId] = "uncertain";
    byCustomer[pair.customerId] = "uncertain";
  }
  for (const id of match.missingIds) byRef[id] = "missing";
  for (const id of match.duplicateIds) byCustomer[id] = "duplicate";
  for (const id of match.extraIds) byCustomer[id] = "extra";

  return { byRef, byCustomer };
}
