import type { RawCandidate } from "./types";
import {
  clampCandidates,
  dedupeCandidates,
  distance,
  orderQuad,
  type Point,
} from "./geometry";

export type DetectMode = "render" | "tray";

export interface DetectionOutput {
  /** cv.Mat that owns the detected image; caller must delete it when rectified */
  mat: any;
  raw: RawCandidate[];
  rectified: boolean;
}

export interface CanvasDetection {
  /** canvas that the returned coordinates refer to (rectified when possible) */
  canvas: HTMLCanvasElement;
  raw: RawCandidate[];
}

const MAX_RECTIFIED_SIDE = 1000;

function safeDelete(value: any): void {
  try {
    value?.delete?.();
  } catch {
    // OpenCV already released it
  }
}

// OpenCV loader intentionally disabled: dependency removed pending approval.
// Keep the detector implementation below for a future approved reactivation.

function borderMedianGray(gray: any): number {
  const data: Uint8Array = gray.data;
  const { cols, rows } = gray;
  const step = Math.max(1, Math.floor(Math.min(cols, rows) / 200));
  const values: number[] = [];

  for (let x = 0; x < cols; x += step) {
    values.push(data[x]);
    values.push(data[(rows - 1) * cols + x]);
  }
  for (let y = 0; y < rows; y += step) {
    values.push(data[y * cols]);
    values.push(data[y * cols + cols - 1]);
  }

  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)] ?? 128;
}

/**
 * Collect keycap-shaped contours from a binary image.
 *
 * Filters are relative to the image area so the same detector works on a
 * 1600px phone photo and a 3732px render. `fill` and `vertices` are what reject
 * the kit title / row-label text: letters are sparse and jagged, keycaps are
 * solid rounded rectangles.
 */
function collectCandidates(
  cv: any,
  binary: any,
  rows: number,
  cols: number
): RawCandidate[] {
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  const candidates: RawCandidate[] = [];

  try {
    cv.findContours(
      binary,
      contours,
      hierarchy,
      cv.RETR_LIST,
      cv.CHAIN_APPROX_SIMPLE
    );

    const imageArea = rows * cols;
    const minArea = imageArea * 0.00032;
    const maxArea = imageArea * 0.03;
    const minSide = Math.max(14, Math.round(Math.sqrt(imageArea) * 0.01));

    for (let i = 0; i < contours.size(); i += 1) {
      const contour = contours.get(i);
      try {
        const area = cv.contourArea(contour);
        if (area < minArea || area > maxArea) continue;

        const rect = cv.boundingRect(contour);
        if (rect.width < minSide || rect.height < minSide) continue;

        const aspect = rect.width / rect.height;
        if (aspect < 0.45 || aspect > 7.5) continue;

        const fill = area / (rect.width * rect.height);
        if (fill < 0.6) continue;

        const perimeter = cv.arcLength(contour, true);
        const approx = new cv.Mat();
        let vertices = 0;
        try {
          cv.approxPolyDP(contour, approx, 0.02 * perimeter, true);
          vertices = approx.rows;
        } finally {
          safeDelete(approx);
        }
        if (vertices > 16) continue;

        candidates.push({
          x: rect.x,
          y: rect.y,
          w: rect.width,
          h: rect.height,
          area,
        });
      } finally {
        safeDelete(contour);
      }
    }
  } finally {
    safeDelete(contours);
    safeDelete(hierarchy);
  }

  return candidates;
}

function detectFromMat(cv: any, source: any, mode: DetectMode): RawCandidate[] {
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));

  try {
    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

    if (mode === "render") {
      cv.Canny(blurred, edges, 20, 60);
    } else {
      cv.Canny(blurred, edges, 25, 70);
    }
    cv.morphologyEx(edges, edges, cv.MORPH_CLOSE, kernel);

    const candidates = collectCandidates(cv, edges, source.rows, source.cols);

    if (mode === "render") {
      // Second pass: cream keys sit just above the beige background in
      // luminance, and Canny sometimes misses their low-contrast edges.
      const background = borderMedianGray(gray);
      if (background < 240) {
        const bright = new cv.Mat();
        try {
          cv.threshold(
            gray,
            bright,
            Math.min(250, background + 10),
            255,
            cv.THRESH_BINARY
          );
          cv.morphologyEx(bright, bright, cv.MORPH_OPEN, kernel);
          cv.morphologyEx(bright, bright, cv.MORPH_CLOSE, kernel);
          candidates.push(
            ...collectCandidates(cv, bright, source.rows, source.cols)
          );
        } finally {
          safeDelete(bright);
        }
      }
    }

    return dedupeCandidates(
      clampCandidates(candidates, source.cols, source.rows)
    );
  } finally {
    safeDelete(gray);
    safeDelete(blurred);
    safeDelete(edges);
    safeDelete(kernel);
  }
}

/**
 * Find the bright moulded tray and rectify it to an upright rectangle.
 *
 * Customer photos are trays of keys, not loose keycaps on a plain background.
 * Rectifying first turns the tray grid into a flat image where the same contour
 * detector can find individual key faces. Returns null when no plausible tray
 * is found, in which case detection runs on the original image.
 */
function rectifyTray(cv: any, source: any): any | null {
  const gray = new cv.Mat();
  const mask = new cv.Mat();
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(7, 7));

  try {
    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
    cv.threshold(gray, mask, 170, 255, cv.THRESH_BINARY);
    cv.morphologyEx(mask, mask, cv.MORPH_CLOSE, kernel);
    cv.morphologyEx(mask, mask, cv.MORPH_OPEN, kernel);

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    let bestIndex = -1;
    let bestArea = 0;

    try {
      cv.findContours(
        mask,
        contours,
        hierarchy,
        cv.RETR_EXTERNAL,
        cv.CHAIN_APPROX_SIMPLE
      );
      for (let i = 0; i < contours.size(); i += 1) {
        const contour = contours.get(i);
        try {
          const area = cv.contourArea(contour);
          if (area > bestArea) {
            bestArea = area;
            bestIndex = i;
          }
        } finally {
          safeDelete(contour);
        }
      }
    } finally {
      safeDelete(hierarchy);
    }

    const imageArea = source.rows * source.cols;
    if (bestIndex < 0 || bestArea < imageArea * 0.12) {
      safeDelete(contours);
      return null;
    }

    const best = contours.get(bestIndex);
    let quad: Point[];
    const approx = new cv.Mat();
    try {
      const perimeter = cv.arcLength(best, true);
      cv.approxPolyDP(best, approx, 0.02 * perimeter, true);
      if (approx.rows === 4) {
        quad = [];
        for (let i = 0; i < 4; i += 1) {
          quad.push({ x: approx.intAt(i, 0), y: approx.intAt(i, 1) });
        }
      } else {
        const rect = cv.boundingRect(best);
        quad = [
          { x: rect.x, y: rect.y },
          { x: rect.x + rect.width, y: rect.y },
          { x: rect.x + rect.width, y: rect.y + rect.height },
          { x: rect.x, y: rect.y + rect.height },
        ];
      }
    } finally {
      safeDelete(approx);
      safeDelete(best);
      safeDelete(contours);
    }

    const [topLeft, topRight, bottomRight, bottomLeft] = orderQuad(quad);
    const width = Math.round(
      Math.max(distance(topLeft, topRight), distance(bottomLeft, bottomRight))
    );
    const height = Math.round(
      Math.max(distance(topLeft, bottomLeft), distance(topRight, bottomRight))
    );
    if (width < 120 || height < 120) return null;

    const sourceQuad = cv.matFromArray(4, 1, cv.CV_32FC2, [
      topLeft.x,
      topLeft.y,
      topRight.x,
      topRight.y,
      bottomRight.x,
      bottomRight.y,
      bottomLeft.x,
      bottomLeft.y,
    ]);
    const destinationQuad = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0,
      0,
      width,
      0,
      width,
      height,
      0,
      height,
    ]);
    const transform = cv.getPerspectiveTransform(sourceQuad, destinationQuad);
    const warped = new cv.Mat();

    try {
      cv.warpPerspective(source, warped, transform, new cv.Size(width, height));
    } finally {
      safeDelete(sourceQuad);
      safeDelete(destinationQuad);
      safeDelete(transform);
    }

    const longest = Math.max(warped.cols, warped.rows);
    if (longest > MAX_RECTIFIED_SIDE) {
      const scale = MAX_RECTIFIED_SIDE / longest;
      const resized = new cv.Mat();
      try {
        cv.resize(
          warped,
          resized,
          new cv.Size(
            Math.round(warped.cols * scale),
            Math.round(warped.rows * scale)
          ),
          0,
          0,
          cv.INTER_AREA
        );
      } finally {
        safeDelete(warped);
      }
      return resized;
    }

    return warped;
  } finally {
    safeDelete(gray);
    safeDelete(mask);
    safeDelete(kernel);
  }
}

/**
 * Detect keycaps on a cv.Mat. When the tray can be rectified the returned mat
 * is a new one that the caller owns; otherwise `mat` is the input itself.
 */
export function detectImage(
  cv: any,
  source: any,
  mode: DetectMode
): DetectionOutput {
  if (mode === "tray") {
    const rectified = rectifyTray(cv, source);
    if (rectified) {
      return {
        mat: rectified,
        raw: detectFromMat(cv, rectified, mode),
        rectified: true,
      };
    }
  }

  return {
    mat: source,
    raw: detectFromMat(cv, source, mode),
    rectified: false,
  };
}

/** Browser wrapper: canvas in, canvas + candidates out. */
export function detectOnCanvas(
  source: HTMLCanvasElement,
  cv: any,
  mode: DetectMode
): CanvasDetection {
  const context = source.getContext("2d", { willReadFrequently: true });
  if (!context) return { canvas: source, raw: [] };

  const image = context.getImageData(0, 0, source.width, source.height);
  const sourceMat = cv.matFromImageData(image);
  let ownedMat: any = null;

  try {
    const result = detectImage(cv, sourceMat, mode);
    if (result.mat !== sourceMat) ownedMat = result.mat;
    if (result.mat === sourceMat) {
      return { canvas: source, raw: result.raw };
    }

    const canvas = document.createElement("canvas");
    canvas.width = result.mat.cols;
    canvas.height = result.mat.rows;
    cv.imshow(canvas, result.mat);
    return { canvas, raw: result.raw };
  } finally {
    safeDelete(ownedMat);
    safeDelete(sourceMat);
  }
}
