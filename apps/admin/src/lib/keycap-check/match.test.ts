import { describe, expect, it } from "vitest";

import { buildStatusMaps, hungarian, matchKeys } from "./match";
import type { DetectedKey, KeycapDescriptor } from "./types";

function key(id: string, units = 1): DetectedKey {
  return {
    id,
    source: "customer",
    imageIndex: 0,
    x: 0,
    y: 0,
    w: 40 * units,
    h: 40,
    area: 1600 * units,
    units,
    sizeClass: `${units}u`,
    manual: false,
  };
}

function descriptor(seed: number): KeycapDescriptor {
  const color = new Float32Array(64).fill(1 / 64);
  const legend = new Float32Array(256);
  legend[seed] = 1;
  return { color, legend, energy: 1, aspect: 1 };
}

/** Legend whose dot product with `descriptor(0)` is 0.4. */
function partialDescriptor(): KeycapDescriptor {
  const color = new Float32Array(64).fill(1 / 64);
  const legend = new Float32Array(256);
  legend[0] = 0.4;
  legend[1] = Math.sqrt(1 - 0.16);
  return { color, legend, energy: 1, aspect: 1 };
}

function mapOf(
  keys: DetectedKey[],
  descriptors: KeycapDescriptor[],
): Map<string, KeycapDescriptor> {
  return new Map(keys.map((item, index) => [item.id, descriptors[index]]));
}

describe("hungarian", () => {
  it("solves a square assignment", () => {
    expect(
      hungarian([
        [1, 2],
        [2, 1],
      ]),
    ).toEqual([0, 1]);
  });

  it("solves a rectangular assignment", () => {
    expect(hungarian([[1, 5, 5]])).toEqual([0]);
    expect(hungarian([[5], [1], [5]])).toEqual([-1, 0, -1]);
  });
});

describe("matchKeys", () => {
  it("matches identical keys one-to-one", () => {
    const refs = [key("r1"), key("r2")];
    const customers = [key("c1"), key("c2")];
    const result = matchKeys(
      refs,
      customers,
      mapOf(refs, [descriptor(0), descriptor(1)]),
      mapOf(customers, [descriptor(1), descriptor(0)]),
    );

    expect(result.matched).toHaveLength(2);
    expect(result.missingIds).toEqual([]);
    expect(result.duplicateIds).toEqual([]);
    expect(result.extraIds).toEqual([]);
  });

  it("flags a second copy of the same key as a duplicate", () => {
    const refs = [key("r1")];
    const customers = [key("c1"), key("c2")];
    const result = matchKeys(
      refs,
      customers,
      mapOf(refs, [descriptor(0)]),
      mapOf(customers, [descriptor(0), descriptor(0)]),
    );

    expect(result.matched).toHaveLength(1);
    expect(result.duplicateIds).toHaveLength(1);
    expect(result.nearestRefByCustomer[result.duplicateIds[0]]).toBe("r1");
  });

  it("flags an unmatched reference as missing", () => {
    const refs = [key("r1"), key("r2")];
    const customers = [key("c1")];
    const result = matchKeys(
      refs,
      customers,
      mapOf(refs, [descriptor(0), descriptor(1)]),
      mapOf(customers, [descriptor(0)]),
    );

    expect(result.missingIds).toEqual(["r2"]);
  });

  it("never pairs keys of different size classes", () => {
    const refs = [key("r1", 1)];
    const customers = [key("c1", 2)];
    const result = matchKeys(
      refs,
      customers,
      mapOf(refs, [descriptor(0)]),
      mapOf(customers, [descriptor(0)]),
    );

    expect(result.missingIds).toEqual(["r1"]);
    expect(result.extraIds).toEqual(["c1"]);
  });

  it("routes a borderline pair to staff review", () => {
    const refs = [key("r1")];
    const customers = [key("c1")];
    const result = matchKeys(
      refs,
      customers,
      mapOf(refs, [descriptor(0)]),
      mapOf(customers, [partialDescriptor()]),
    );

    expect(result.uncertain).toHaveLength(1);
    expect(result.matched).toHaveLength(0);
    expect(result.entries[0].status).toBe("uncertain");
  });

  it("builds overlay status maps for both sides", () => {
    const refs = [key("r1"), key("r2")];
    const customers = [key("c1"), key("c2")];
    const result = matchKeys(
      refs,
      customers,
      mapOf(refs, [descriptor(0), descriptor(1)]),
      mapOf(customers, [descriptor(0), descriptor(0)]),
    );
    const maps = buildStatusMaps(result);

    expect(maps.byRef.r1).toBe("matched");
    expect(maps.byRef.r2).toBe("missing");
    expect(maps.byCustomer.c1).toBe("matched");
    expect(maps.byCustomer.c2).toBe("duplicate");
  });
});
