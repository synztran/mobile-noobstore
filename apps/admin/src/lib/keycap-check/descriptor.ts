import type { KeycapDescriptor } from "./types";

export interface RgbaImage {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
}

/** Below this grayscale standard deviation a keycap is treated as blank. */
export const BLANK_ENERGY = 0.02;

const COLOR_BINS = 4;
const COLOR_BIN_COUNT = COLOR_BINS ** 3;

function clampBin(value: number, max: number): number {
  if (value < 0) return 0;
  if (value > max) return max;
  return value;
}

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** sRGB → CIE Lab (D65 white point). */
export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const x = (lr * 0.4124 + lg * 0.3576 + lb * 0.1805) / 0.95047;
  const y = lr * 0.2126 + lg * 0.7152 + lb * 0.0722;
  const z = (lr * 0.0193 + lg * 0.1192 + lb * 0.9505) / 1.08883;

  const f = (value: number) =>
    value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;

  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/**
 * Build a compact identity descriptor from a square RGBA crop.
 *
 * Colour alone is useless inside a single kit (every key is the same plastic),
 * so the legend signature carries most of the matching signal. Blank keys have
 * near-zero `energy`; the matcher treats two blank crops as identical instead
 * of comparing noise.
 */
export function computeDescriptor(
  image: RgbaImage,
  aspect: number,
): KeycapDescriptor {
  const { width, height, data } = image;
  const pixelCount = Math.max(1, width * height);
  const color = new Float32Array(COLOR_BIN_COUNT);
  const gray = new Float32Array(pixelCount);

  for (let i = 0; i < pixelCount; i += 1) {
    const offset = i * 4;
    const r = data[offset] ?? 0;
    const g = data[offset + 1] ?? 0;
    const b = data[offset + 2] ?? 0;

    const [l, a, labB] = rgbToLab(r, g, b);
    const li = clampBin(Math.floor((l / 100) * COLOR_BINS), COLOR_BINS - 1);
    const ai = clampBin(
      Math.floor(((a + 128) / 255) * COLOR_BINS),
      COLOR_BINS - 1,
    );
    const bi = clampBin(
      Math.floor(((labB + 128) / 255) * COLOR_BINS),
      COLOR_BINS - 1,
    );
    color[li * COLOR_BINS * COLOR_BINS + ai * COLOR_BINS + bi] += 1;

    gray[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  for (let i = 0; i < color.length; i += 1) color[i] /= pixelCount;

  let mean = 0;
  for (let i = 0; i < gray.length; i += 1) mean += gray[i];
  mean /= pixelCount;

  let variance = 0;
  for (let i = 0; i < gray.length; i += 1) {
    const delta = gray[i] - mean;
    variance += delta * delta;
  }
  variance /= pixelCount;
  const energy = Math.sqrt(variance);

  const legend = new Float32Array(pixelCount);
  if (energy >= BLANK_ENERGY) {
    let norm = 0;
    for (let i = 0; i < gray.length; i += 1) {
      const delta = gray[i] - mean;
      legend[i] = delta;
      norm += delta * delta;
    }
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < legend.length; i += 1) legend[i] /= norm;
  }

  return {
    color,
    legend,
    energy,
    aspect: aspect > 0 && Number.isFinite(aspect) ? aspect : 1,
  };
}

/**
 * Distance in the range 0..1. Lower is more similar.
 *
 * Weights favour the legend because colour is shared across a kit. The aspect
 * term is a weak tie-breaker only; size classes are already gated by the
 * matcher before this is called.
 */
export function descriptorDistance(
  a: KeycapDescriptor,
  b: KeycapDescriptor,
): number {
  let colorDistance = 0;
  const colorLength = Math.min(a.color.length, b.color.length);
  for (let i = 0; i < colorLength; i += 1) {
    colorDistance += Math.abs(a.color[i] - b.color[i]);
  }
  colorDistance = Math.min(1, colorDistance / 2);

  let legendDistance: number;
  const aBlank = a.energy < BLANK_ENERGY;
  const bBlank = b.energy < BLANK_ENERGY;
  if (aBlank && bBlank) {
    legendDistance = 0;
  } else if (aBlank || bBlank) {
    legendDistance = 1;
  } else {
    let dot = 0;
    const legendLength = Math.min(a.legend.length, b.legend.length);
    for (let i = 0; i < legendLength; i += 1) {
      dot += a.legend[i] * b.legend[i];
    }
    legendDistance = (1 - Math.min(1, Math.max(-1, dot))) / 2;
  }

  const aspectDistance = Math.min(
    1,
    Math.abs(Math.log(Math.max(1e-3, a.aspect) / Math.max(1e-3, b.aspect))) /
      Math.LN2,
  );

  return 0.15 * colorDistance + 0.75 * legendDistance + 0.1 * aspectDistance;
}
