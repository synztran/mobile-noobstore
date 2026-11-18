import { describe, expect, it } from "vitest";

import {
  BLANK_ENERGY,
  computeDescriptor,
  descriptorDistance,
  rgbToLab,
  type RgbaImage,
} from "./descriptor";

function image(
  width: number,
  height: number,
  fill: (x: number, y: number) => [number, number, number],
): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = fill(x, y);
      const offset = (y * width + x) * 4;
      data[offset] = r;
      data[offset + 1] = g;
      data[offset + 2] = b;
      data[offset + 3] = 255;
    }
  }
  return { width, height, data };
}

describe("descriptor", () => {
  it("converts white and black to sane Lab values", () => {
    const [whiteL] = rgbToLab(255, 255, 255);
    const [blackL] = rgbToLab(0, 0, 0);
    expect(whiteL).toBeCloseTo(100, 1);
    expect(blackL).toBeCloseTo(0, 1);
  });

  it("marks a flat crop as blank", () => {
    const descriptor = computeDescriptor(image(16, 16, () => [200, 200, 200]), 1);
    expect(descriptor.energy).toBeLessThan(BLANK_ENERGY);
  });

  it("reports zero distance for identical crops", () => {
    const crop = image(16, 16, (x, y) => (x < 8 && y < 8 ? [20, 20, 20] : [220, 220, 220]));
    const a = computeDescriptor(crop, 1);
    const b = computeDescriptor(crop, 1);
    expect(descriptorDistance(a, b)).toBeCloseTo(0, 6);
  });

  it("keeps two blank keys close even when their plastic shade differs slightly", () => {
    const a = computeDescriptor(image(16, 16, () => [200, 200, 200]), 1);
    const b = computeDescriptor(image(16, 16, () => [203, 203, 203]), 1);
    expect(descriptorDistance(a, b)).toBeLessThan(0.1);
  });

  it("separates two different legends", () => {
    const a = computeDescriptor(
      image(16, 16, (x) => (x < 8 ? [20, 20, 20] : [220, 220, 220])),
      1,
    );
    const b = computeDescriptor(
      image(16, 16, (_x, y) => (y < 8 ? [20, 20, 20] : [220, 220, 220])),
      1,
    );
    expect(descriptorDistance(a, b)).toBeGreaterThan(0.2);
  });

  it("penalises a blank key matched against a legend key", () => {
    const blank = computeDescriptor(image(16, 16, () => [200, 200, 200]), 1);
    const legend = computeDescriptor(
      image(16, 16, (x) => (x < 8 ? [20, 20, 20] : [220, 220, 220])),
      1,
    );
    expect(descriptorDistance(blank, legend)).toBeGreaterThan(0.6);
  });
});
