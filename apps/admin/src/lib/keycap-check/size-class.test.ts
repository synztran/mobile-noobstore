import { describe, expect, it } from "vitest";

import {
  assignSizeClasses,
  estimateBaseUnit,
  sizeClassLabel,
  snapUnits,
  unitsForBox,
} from "./size-class";
import type { DetectedKey } from "./types";

function key(partial: Partial<DetectedKey>): DetectedKey {
  return {
    id: "k",
    source: "customer",
    imageIndex: 0,
    x: 0,
    y: 0,
    w: 40,
    h: 40,
    area: 1600,
    units: 0,
    sizeClass: "?",
    manual: false,
    ...partial,
  };
}

describe("size classes", () => {
  it("uses square keys as the 1u ruler and ignores spacebars", () => {
    const keys = [
      ...Array.from({ length: 8 }, () => ({ w: 40, h: 41 })),
      { w: 250, h: 40 },
    ];
    expect(estimateBaseUnit(keys)).toBe(40);
  });

  it("snaps measured ratios to the GMK ladder", () => {
    expect(snapUnits(1)).toBe(1);
    expect(snapUnits(1.24)).toBe(1.25);
    expect(snapUnits(1.98)).toBe(2);
    expect(snapUnits(6.2)).toBe(6.25);
    expect(snapUnits(7.05)).toBe(7);
  });

  it("keeps off-ladder shapes on a quarter-unit value", () => {
    expect(snapUnits(1.62)).toBe(1.5);
    expect(snapUnits(4.6)).toBe(4.5);
  });

  it("measures width from the long edge", () => {
    expect(unitsForBox(40, 120, 40)).toBe(3);
    expect(unitsForBox(120, 40, 40)).toBe(3);
    expect(sizeClassLabel(1.25)).toBe("1.25u");
  });

  it("estimates scale per image so close-ups and wide shots still match", () => {
    const closeUp = Array.from({ length: 10 }, (_, i) =>
      key({ id: `close-${i}`, imageIndex: 0, w: 80, h: 80, area: 6400 }),
    );
    const wide = Array.from({ length: 10 }, (_, i) =>
      key({ id: `wide-${i}`, imageIndex: 1, w: 40, h: 40, area: 1600 }),
    );
    const spacebar = key({
      id: "wide-space",
      imageIndex: 1,
      w: 250,
      h: 40,
      area: 10000,
    });

    const sized = assignSizeClasses([...closeUp, ...wide, spacebar], "customer");
    expect(sized.find((item) => item.id === "close-0")?.sizeClass).toBe("1u");
    expect(sized.find((item) => item.id === "wide-0")?.sizeClass).toBe("1u");
    expect(sized.find((item) => item.id === "wide-space")?.sizeClass).toBe(
      "6.25u",
    );
  });
});
