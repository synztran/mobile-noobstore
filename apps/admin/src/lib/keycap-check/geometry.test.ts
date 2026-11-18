import { describe, expect, it } from "vitest";

import {
  boxIou,
  centerInside,
  dedupeCandidates,
  orderQuad,
  sortReadingOrder,
} from "./geometry";

describe("geometry", () => {
  it("computes intersection over union", () => {
    expect(boxIou({ x: 0, y: 0, w: 10, h: 10 }, { x: 0, y: 0, w: 10, h: 10 })).toBe(1);
    expect(boxIou({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 20, w: 10, h: 10 })).toBe(0);
    expect(boxIou({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 0, w: 10, h: 10 })).toBeCloseTo(
      50 / 150,
    );
  });

  it("detects a centre inside another box", () => {
    expect(
      centerInside({ x: 4, y: 4, w: 2, h: 2 }, { x: 0, y: 0, w: 10, h: 10 }),
    ).toBe(true);
    expect(
      centerInside({ x: 20, y: 20, w: 2, h: 2 }, { x: 0, y: 0, w: 10, h: 10 }),
    ).toBe(false);
  });

  it("collapses nested keycap contours and keeps the outer box", () => {
    const outer = { x: 10, y: 10, w: 40, h: 40, area: 1500 };
    const face = { x: 14, y: 14, w: 32, h: 32, area: 1000 };
    const legend = { x: 24, y: 24, w: 12, h: 12, area: 140 };
    const neighbour = { x: 60, y: 10, w: 40, h: 40, area: 1500 };

    const result = dedupeCandidates([face, legend, neighbour, outer]);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual(outer);
    expect(result).toContainEqual(neighbour);
  });

  it("sorts rows top-to-bottom and columns left-to-right", () => {
    const boxes = [
      { x: 100, y: 10, w: 20, h: 20, area: 400 },
      { x: 10, y: 12, w: 20, h: 20, area: 400 },
      { x: 10, y: 60, w: 20, h: 20, area: 400 },
    ];
    const sorted = sortReadingOrder(boxes);
    expect(sorted.map((box) => [box.x, box.y])).toEqual([
      [10, 12],
      [100, 10],
      [10, 60],
    ]);
  });

  it("orders quad corners as TL, TR, BR, BL", () => {
    const ordered = orderQuad([
      { x: 10, y: 10 },
      { x: 90, y: 12 },
      { x: 88, y: 92 },
      { x: 8, y: 90 },
    ]);
    expect(ordered).toEqual([
      { x: 10, y: 10 },
      { x: 90, y: 12 },
      { x: 88, y: 92 },
      { x: 8, y: 90 },
    ]);
  });
});
