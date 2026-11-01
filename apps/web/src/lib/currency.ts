/**
 * One shared Intl.NumberFormat for the whole process.
 *
 * Constructing an Intl object is expensive (it builds an ICU formatter), and
 * formatVND runs once per product row, price and email line — so building one
 * per call was measurable against Vercel's Active CPU budget.
 */
const VND_FORMATTER = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

/**
 * Format a number as Vietnamese Dong (VND).
 *
 * Examples:
 *   formatVND(285000)   → "285.000 ₫"
 *   formatVND(1500000)  → "1.500.000 ₫"
 *   formatVND(0)        → "0 ₫"
 *
 * Note: negatives clamp to "0 ₫" here. The admin app's copy deliberately does
 * NOT clamp — do not unify the two without checking the admin price inputs.
 */
export function formatVND(amount: number): string {
  return VND_FORMATTER.format(Math.max(0, amount));
}

/**
 * Format a number as Vietnamese Dong abbreviated with K suffix for thousands.
 *
 * Examples:
 *   formatShortVND(285000)   → "285K"
 *   formatShortVND(1500000)  → "1.5M"
 *   formatShortVND(0)        → "0"
 */
export function formatShortVND(amount: number): string {
  const removeNegativeAmount = Math.abs(amount);
  if (removeNegativeAmount === 0) return "0";
  if (removeNegativeAmount < 1000) return removeNegativeAmount.toString();

  const absAmount = Math.abs(amount);
  let value = amount;
  let suffix = "";

  if (absAmount >= 1000000) {
    value = amount / 1000000;
    suffix = "m";
  } else {
    value = amount / 1000;
    suffix = "k";
  }

  // Format with up to 1 decimal place, removing trailing .0
  const formatted = value % 1 === 0 ? value.toString() : value.toFixed(1);

  return formatted + suffix;
}

/**
 * Render a price as a canvas image (base64) to prevent easy data crawling.
 * Usage: <img src={renderPriceAsImage(285000)} alt="285.000 ₫" />
 */
export function renderPriceAsImage(
  amount: number,
  options?: {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    bgColor?: string;
    paddingX?: number;
    paddingY?: number;
  }
): string {
  const price = formatVND(amount);
  const {
    fontSize = 24,
    fontFamily = "Arial, sans-serif",
    color = "#222",
    bgColor = "transparent",
    paddingX = 8,
    paddingY = 4,
  } = options || {};

  // Create a canvas
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.font = `${fontSize}px ${fontFamily}`;
  const textMetrics = ctx.measureText(price);
  const width = Math.ceil(textMetrics.width) + paddingX * 2;
  const height = fontSize + paddingY * 2;
  canvas.width = width;
  canvas.height = height;

  // Set background
  if (bgColor !== "transparent") {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
  }

  // Draw text
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  ctx.fillText(price, paddingX, paddingY);

  // Return as base64 image
  return canvas.toDataURL("image/png");
}
