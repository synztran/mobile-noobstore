import type { DetectedKey, KeycapDescriptor } from "./types";
import { computeDescriptor } from "./descriptor";

/** Crop slightly inside the bounding box so tray dividers never leak in. */
const INSET = 0.08;

interface CropRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

function cropRect(key: DetectedKey): CropRect | null {
  const insetX = key.w * INSET;
  const insetY = key.h * INSET;
  const sw = key.w - insetX * 2;
  const sh = key.h - insetY * 2;
  if (sw <= 0 || sh <= 0) return null;
  return { sx: key.x + insetX, sy: key.y + insetY, sw, sh };
}

/** Draw a keycap crop into a visible canvas (used by thumbnails and print). */
export function drawKeyCrop(
  target: HTMLCanvasElement,
  source: HTMLCanvasElement,
  key: DetectedKey,
  size: number,
): void {
  const rect = cropRect(key);
  if (!rect) return;

  const dpr =
    typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  target.width = Math.round(size * dpr);
  target.height = Math.round(size * dpr);
  target.style.width = `${size}px`;
  target.style.height = `${size}px`;

  const context = target.getContext("2d");
  if (!context) return;

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.fillStyle = "#e2e8f0";
  context.fillRect(0, 0, size, size);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    source,
    rect.sx,
    rect.sy,
    rect.sw,
    rect.sh,
    0,
    0,
    size,
    size,
  );
}

/** Square RGBA crop used to build a descriptor. */
export function cropToImageData(
  source: HTMLCanvasElement,
  key: DetectedKey,
  size = 16,
): ImageData | null {
  const rect = cropRect(key);
  if (!rect) return null;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    source,
    rect.sx,
    rect.sy,
    rect.sw,
    rect.sh,
    0,
    0,
    size,
    size,
  );

  return context.getImageData(0, 0, size, size);
}

export function descriptorForCanvasKey(
  source: HTMLCanvasElement,
  key: DetectedKey,
): KeycapDescriptor | null {
  const image = cropToImageData(source, key, 16);
  if (!image) return null;
  const aspect = key.h > 0 ? key.w / key.h : 1;
  return computeDescriptor(
    { width: image.width, height: image.height, data: image.data },
    aspect,
  );
}
