"use client";

import { removeBackground } from "@imgly/background-removal";

/**
 * Client-side product photo pipeline for the admin: strip the background,
 * then composite the product onto the store's standard 800x800 grid
 * background (product ≤ 600x600, centered, aspect ratio locked) and export
 * a JPEG.
 *
 * Pure in-browser (canvas + imgly Wasm) — no serverless ML, no API keys.
 */

export const COMPOSITE_SIZE = 800;
export const COMPOSITE_PADDING = 100;
export const MAX_PRODUCT_EDGE = COMPOSITE_SIZE - COMPOSITE_PADDING * 2; // 600

export interface ProcessedPhoto {
  /** Final 800x800 JPEG composite (product on the standard background). */
  composite: Blob;
  /** Transparent product-only PNG (kept for future re-backing). */
  cutout: Blob;
}

function decodeFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không đọc được ảnh"));
    };
    img.src = url;
  });
}

function decodeBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không đọc được ảnh cắt nền"));
    };
    img.src = url;
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Không tải được ảnh nền chuẩn"));
    img.src = url;
  });
}

/** Canvas wrapping to keep memory sane on very large uploads. */
function capCanvasSize(
  file: File
): Promise<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }> {
  return decodeFile(file).then((img) => {
    const maxSource = 2048;
    const scale = Math.min(
      1,
      maxSource / Math.max(img.naturalWidth, img.naturalHeight)
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas không được hỗ trợ");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { canvas, ctx };
  });
}

/**
 * Deterministic fallback when the ML background removal fails: assume a
 * near-uniform background (sample the four corners), then erase pixels that
 * fall within a colour tolerance of it. Transparent PNG in, product in the
 * middle survives.
 */
async function flatBackgroundCutout(file: File): Promise<Blob> {
  const { canvas, ctx } = await capCanvasSize(file);
  const { width, height } = canvas;

  const imageData = ctx.getImageData(0, 0, width, height);
  const px = imageData.data;

  const patch = 8;
  const sample = (x: number, y: number) => {
    let r = 0,
      g = 0,
      b = 0,
      n = 0;
    for (let dy = 0; dy < patch; dy++) {
      for (let dx = 0; dx < patch; dx++) {
        const i =
          (Math.min(height - 1, y + dy) * width + Math.min(width - 1, x + dx)) *
          4;
        r += px[i];
        g += px[i + 1];
        b += px[i + 2];
        n++;
      }
    }
    return { r: r / n, g: g / n, b: b / n };
  };

  const corners = [
    sample(0, 0),
    sample(width - 1, 0),
    sample(0, height - 1),
    sample(width - 1, height - 1),
  ];
  const bg = {
    r: corners.reduce((s, c) => s + c.r, 0) / 4,
    g: corners.reduce((s, c) => s + c.g, 0) / 4,
    b: corners.reduce((s, c) => s + c.b, 0) / 4,
  };

  const tolerance = 28;
  for (let i = 0; i < px.length; i += 4) {
    const dr = Math.abs(px[i] - bg.r);
    const dg = Math.abs(px[i + 1] - bg.g);
    const db = Math.abs(px[i + 2] - bg.b);
    if (dr <= tolerance && dg <= tolerance && db <= tolerance) {
      px[i + 3] = 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  if (!blob) throw new Error("Không mã hóa được ảnh cắt nền");
  return blob;
}
/** High-quality downscale of an image to the given target box (aspect kept).
 *
 * Browsers (especially Safari/WebKit) produce aliased, soft results when a
 * single drawImage step shrinks an image by a large ratio (e.g. a 3000px
 * source photo into a 600px box). Halving repeatedly with high smoothing
 * until within 2× of the target, then doing the final step, keeps edges
 * crisp on every browser.
 */
function downscaleToBox(
  source: CanvasImageSource,
  sourceW: number,
  sourceH: number,
  targetW: number,
  targetH: number
): HTMLCanvasElement {
  let curW = sourceW;
  let curH = sourceH;
  let cur: CanvasImageSource = source;

  // Progressive halving while still more than 2× the target.
  while (curW > targetW * 2 && curH > targetH * 2) {
    const nextW = Math.max(1, Math.floor(curW / 2));
    const nextH = Math.max(1, Math.floor(curH / 2));
    const step = document.createElement("canvas");
    step.width = nextW;
    step.height = nextH;
    const stepCtx = step.getContext("2d");
    if (!stepCtx) break; // fall through with whatever we have
    stepCtx.imageSmoothingEnabled = true;
    stepCtx.imageSmoothingQuality = "high";
    stepCtx.drawImage(cur, 0, 0, nextW, nextH);
    cur = step;
    curW = nextW;
    curH = nextH;
  }

  // Final step into the exact target box.
  const out = document.createElement("canvas");
  out.width = targetW;
  out.height = targetH;
  const outCtx = out.getContext("2d");
  if (outCtx) {
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = "high";
    outCtx.drawImage(cur, 0, 0, targetW, targetH);
  }
  return out;
}

/** Draw an image element into a fresh canvas (1:1). */
function imageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.drawImage(img, 0, 0);
  }
  return canvas;
}

/** Crop a canvas to the bounding box of its solidly-opaque pixels.
 *
 * Background-removal cutouts keep the original photo's full canvas with
 * transparent margins wherever the background was erased. Scaling by the full
 * dimensions makes the visible product render much smaller than the original
 * photo showed it — trimming to the alpha bounding box first means the actual
 * product fills the composite box.
 *
 * The box is computed robustly: a row/column only counts as product when it
 * has a meaningful number of strongly-opaque pixels. Faint ML halos and
 * stray semi-transparent specks (alpha just above 0, often floating above
 * the product) must not stretch the box — otherwise the trimmed box extends
 * into empty space and the visible product sits off-center (typically low)
 * in the composite.
 */
function trimToAlphaBox(source: HTMLCanvasElement): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  const full = source;
  const fullCtx = full.getContext("2d", { willReadFrequently: true });
  if (!fullCtx) {
    // Can't inspect alpha — return as-is, behaves like the old code.
    return full;
  }

  let data: ImageData;
  try {
    data = fullCtx.getImageData(0, 0, w, h);
  } catch {
    return full;
  }
  const px = data.data;

  // A pixel is "solid" only near-fully-opaque: the ML cutout leaves
  // semi-opaque remnants (halos, whitish patches that blend invisibly into
  // the light background) which still stretch lower-threshold bounding boxes
  // and push the product off-center. 250 keeps them out while the product
  // body — solid photo content — measures at 255.
  const ALPHA_THRESHOLD = 250;
  const colSolid = new Uint32Array(w);
  const rowSolid = new Uint32Array(h);
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let x = 0; x < w; x++) {
      if (px[row + x * 4 + 3] > ALPHA_THRESHOLD) {
        colSolid[x]++;
        rowSolid[y]++;
      }
    }
  }

  // A row/column is part of the product only when it holds a meaningful run
  // of solid pixels — relative to the densest row/column, not an absolute
  // count, so wide faint bands can never define the box either.
  const minSolid = Math.max(2, Math.round(Math.min(w, h) * 0.01));
  const maxCol = Math.max(...colSolid);
  const maxRow = Math.max(...rowSolid);
  const colLimit = Math.max(minSolid, Math.round(maxCol * 0.05));
  const rowLimit = Math.max(minSolid, Math.round(maxRow * 0.05));

  let minX = -1,
    minY = -1,
    maxX = -1,
    maxY = -1;
  for (let x = 0; x < w; x++) {
    if (colSolid[x] >= colLimit) {
      if (minX < 0) minX = x;
      maxX = x;
    }
  }
  for (let y = 0; y < h; y++) {
    if (rowSolid[y] >= rowLimit) {
      if (minY < 0) minY = y;
      maxY = y;
    }
  }

  // No solid content, or nothing to trim → return the original canvas.
  if (
    minX < 0 ||
    minY < 0 ||
    (minX === 0 && minY === 0 && maxX === w - 1 && maxY === h - 1)
  ) {
    return full;
  }

  const tw = maxX - minX + 1;
  const th = maxY - minY + 1;
  const out = document.createElement("canvas");
  out.width = tw;
  out.height = th;
  const outCtx = out.getContext("2d");
  if (outCtx) {
    outCtx.drawImage(full, minX, minY, tw, th, 0, 0, tw, th);
  }
  return out;
}

/**
 * Erase faint cutout remnants that sit apart from the main product.
 *
 * ML background removal sometimes keeps semi-transparent ghosts of things
 * behind the product (store watermarks, decorative shapes). These are far
 * weaker than the product body and often disconnected from it. This pass:
 * - zeroes alpha below ALPHA_FLOOR (kills near-invisible haze),
 * - finds connected components of remaining alpha and keeps only the largest
 *   (the product); everything else is erased.
 *
 * Runs on a downsampled copy (≤ 512px) for speed, and scales the component
 * boxes back up; small anti-aliased islands attached visually to the product
 * are kept because they touch the main component.
 */
function eraseStrayComponents(canvasEl: HTMLCanvasElement): void {
  const w = canvasEl.width;
  const h = canvasEl.height;
  const ctx = canvasEl.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;

  let data: ImageData;
  try {
    data = ctx.getImageData(0, 0, w, h);
  } catch {
    return;
  }
  const px = data.data;

  // 1. Kill near-invisible haze.
  const ALPHA_FLOOR = 32;
  for (let i = 3; i < px.length; i += 4) {
    if (px[i] < ALPHA_FLOOR) px[i] = 0;
  }

  // 2. Connected-component analysis on the downsampled alpha grid.
  const SAMPLE = Math.max(1, Math.round(Math.max(w, h) / 512));
  const gw = Math.max(1, Math.floor(w / SAMPLE));
  const gh = Math.max(1, Math.floor(h / SAMPLE));
  const alphaAt = (gx: number, gy: number) => {
    const x = Math.min(w - 1, gx * SAMPLE);
    const y = Math.min(h - 1, gy * SAMPLE);
    return px[(y * w + x) * 4 + 3];
  };

  const PRESENT = 40; // grid cell is product-ish if alpha ≥ this
  const labels = new Int32Array(gw * gh).fill(-1);
  const stack: number[] = [];
  let bestLabel = -1;
  let bestSize = 0;
  let label = 0;
  const sizes: number[] = [];

  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const idx = gy * gw + gx;
      if (labels[idx] !== -1 || alphaAt(gx, gy) < PRESENT) continue;
      // Flood-fill this component.
      let size = 0;
      labels[idx] = label;
      stack.push(idx);
      while (stack.length > 0) {
        const cur = stack.pop() as number;
        size++;
        const cx = cur % gw;
        const cy = (cur - cx) / gw;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
            const nIdx = ny * gw + nx;
            if (labels[nIdx] === -1 && alphaAt(nx, ny) >= PRESENT) {
              labels[nIdx] = label;
              stack.push(nIdx);
            }
          }
        }
      }
      sizes.push(size);
      if (size > bestSize) {
        bestSize = size;
        bestLabel = label;
      }
      label++;
    }
  }

  if (bestLabel < 0) return;

  // 3. Erase every *small* component entirely, whatever its opacity.
  // Stray remnants (background watermarks, decor ghosts) can be strongly
  // opaque — a weak-alpha guard would let them survive erasure, still count
  // in the trim box, and push the product off-center. Anything far smaller
  // than the main component is not part of the product, so full erase is
  // safe: multi-part products (keycap sets, kits) are one connected blob or
  // have parts comparable in size to the body, never tiny specks.
  const keepMinSize = Math.max(16, Math.round(bestSize * 0.05));
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const idx = gy * gw + gx;
      const lbl = labels[idx];
      if (lbl === bestLabel || lbl === -1) continue;
      if (sizes[lbl] >= keepMinSize) continue; // sizeable separate part → keep
      // Erase the full sampled block for this stray cell.
      const x0 = gx * SAMPLE;
      const y0 = gy * SAMPLE;
      for (let y = y0; y < Math.min(h, y0 + SAMPLE); y++) {
        for (let x = x0; x < Math.min(w, x0 + SAMPLE); x++) {
          const i = (y * w + x) * 4;
          px[i + 3] = 0;
        }
      }
    }
  }

  ctx.putImageData(data, 0, 0);
}

/** Light unsharp mask to restore crispness after downscaling.
 *
 * High-quality resampling is slightly low-pass by design; a single 3×3
 * convolution (center weight > sum of neighbours) puts edge snap back into
 * the product. Kept gentle to avoid halos on the cutout's alpha boundary.
 */
function sharpenCanvas(canvasEl: HTMLCanvasElement, amount = 0.35): void {
  const w = canvasEl.width;
  const h = canvasEl.height;
  if (w < 3 || h < 3) return;
  const ctx = canvasEl.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;

  let data: ImageData;
  try {
    data = ctx.getImageData(0, 0, w, h);
  } catch {
    return;
  }
  const src = data.data;
  const out = new Uint8ClampedArray(src);
  const center = 1 + 4 * amount;
  const neighbor = amount;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      if (src[i + 3] === 0) continue;
      for (let c = 0; c < 3; c++) {
        const v =
          center * src[i + c] -
          neighbor *
            (src[i - 4 + c] +
              src[i + 4 + c] +
              src[i - w * 4 + c] +
              src[i + w * 4 + c]);
        out[i + c] = v;
      }
    }
  }

  ctx.putImageData(new ImageData(out, w, h), 0, 0);
}

/**
 * Composite the transparent cutout onto the standard background:
 * - background cover-fills the 800x800 canvas (no distortion)
 * - cutout is trimmed to the product's visible bounding box, then
 *   `contain`-scaled to a ≤ 600x600 box and centered (aspect kept)
 * - output is a JPEG at the given quality, no filters/shadows applied
 */
export async function compositeOnBackground(
  cutout: Blob,
  backgroundUrl: string,
  size: number = COMPOSITE_SIZE,
  padding: number = COMPOSITE_PADDING,
  quality: number = 0.95
): Promise<Blob> {
  const [bg, product] = await Promise.all([
    loadImage(backgroundUrl),
    decodeBlob(cutout),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas không được hỗ trợ");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Background: cover-fill via a high-quality pre-downscale when the source is
  // much larger than the canvas (avoids single-step aliasing).
  const bgScale = Math.max(size / bg.naturalWidth, size / bg.naturalHeight);
  const bgW = Math.round(bg.naturalWidth * bgScale);
  const bgH = Math.round(bg.naturalHeight * bgScale);
  if (bgW > size * 2 || bgH > size * 2) {
    const bgScaled = downscaleToBox(
      bg,
      bg.naturalWidth,
      bg.naturalHeight,
      bgW,
      bgH
    );
    ctx.drawImage(bgScaled, (size - bgW) / 2, (size - bgH) / 2);
  } else {
    ctx.drawImage(bg, (size - bgW) / 2, (size - bgH) / 2, bgW, bgH);
  }

  const maxEdge = size - padding * 2;
  // Clean the cutout BEFORE measuring it: erase ghosts of background objects
  // (watermarks, decor) and haze, then trim to the bounding box of what
  // actually survives. Trimming first would let erased regions (or remnants
  // the eraser keeps) stretch the box and push the product off-center.
  const productCanvas = imageToCanvas(product);
  eraseStrayComponents(productCanvas);
  const trimmed = trimToAlphaBox(productCanvas);
  const pScale = Math.min(
    1,
    maxEdge / Math.max(1, trimmed.width),
    maxEdge / Math.max(1, trimmed.height)
  );
  const pw = Math.max(1, Math.round(trimmed.width * pScale));
  const ph = Math.max(1, Math.round(trimmed.height * pScale));
  if (pScale < 0.5) {
    // Large downscale ratio → progressive halving keeps product edges crisp.
    const productScaled = downscaleToBox(
      trimmed,
      trimmed.width,
      trimmed.height,
      pw,
      ph
    );
    sharpenCanvas(productScaled);
    ctx.drawImage(productScaled, (size - pw) / 2, (size - ph) / 2);
  } else {
    // Render through an intermediate canvas at final size so the sharpen
    // pass applies on every path, not just the deep-downscale one.
    const productStage = downscaleToBox(
      trimmed,
      trimmed.width,
      trimmed.height,
      pw,
      ph
    );
    sharpenCanvas(productStage);
    ctx.drawImage(productStage, (size - pw) / 2, (size - ph) / 2);
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  if (!blob) throw new Error("Không mã hóa được ảnh ghép nền");
  return blob;
}

/**
 * Run the full pipeline on an uploaded product photo:
 * 1. remove the background (imgly Wasm, flat-colour fallback on failure)
 * 2. composite onto the standard 800x800 background, JPEG quality 0.95
 */
export async function processProductPhoto(
  file: File,
  backgroundUrl: string
): Promise<ProcessedPhoto> {
  let cutout: Blob;
  try {
    cutout = await removeBackground(file, {
      model: "isnet_fp16",
      output: { format: "image/png" },
    });
  } catch {
    cutout = await flatBackgroundCutout(file);
  }

  if (!cutout.type.startsWith("image/")) {
    cutout = new Blob([cutout], { type: "image/png" });
  }

  const composite = await compositeOnBackground(cutout, backgroundUrl);
  return { composite, cutout };
}
