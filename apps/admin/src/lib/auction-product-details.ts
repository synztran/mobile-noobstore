export interface AuctionProductDetails {
  specs: Array<{ label: string; value: string }>;
  condition: { grade: "S" | "A" | "B" | "C" | "D"; summary: string[]; attributes: Array<{ label: string; value: string }>; images: string[]; image_captions?: string[] };
  accessories: string[];
}

const MAX_ITEMS = 20;
const MAX_LENGTH = 500;

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= MAX_LENGTH ? trimmed : null;
}

function rows(value: unknown): AuctionProductDetails["specs"] | null {
  if (!Array.isArray(value) || value.length > MAX_ITEMS) return null;
  const result = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const row = item as Record<string, unknown>;
    const label = text(row.label);
    const rowValue = text(row.value);
    if (!label || !rowValue) return null;
    result.push({ label, value: rowValue });
  }
  return result;
}

function textList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > MAX_ITEMS) return null;
  const result = value.map(text);
  return result.some((item) => !item) ? null : result as string[];
}

export function parseAuctionProductDetails(value: unknown): AuctionProductDetails | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  if (!data.condition || typeof data.condition !== "object" || Array.isArray(data.condition)) return null;
  const condition = data.condition as Record<string, unknown>;
  const grade = ["S", "A", "B", "C", "D"].includes(condition.grade as string) ? condition.grade as AuctionProductDetails["condition"]["grade"] : null;
  const specs = rows(data.specs);
  const summary = textList(condition.summary);
  const attributes = rows(condition.attributes);
  const accessories = textList(data.accessories);
  const images = condition.images === undefined ? [] : textList(condition.images);
  const rawCaptions = condition.image_captions === undefined ? Array(images?.length ?? 0).fill("") : condition.image_captions;
  const captions = Array.isArray(rawCaptions) && rawCaptions.length <= MAX_ITEMS
    ? rawCaptions.map((caption) => typeof caption === "string" && caption.trim().length <= MAX_LENGTH ? caption.trim() : null)
    : null;
  if (!grade || !specs || !summary || !attributes || !accessories || !images || !captions || captions.some((caption) => caption === null) || captions.length > images.length || images.some((url) => {
    try { return !["http:", "https:"].includes(new URL(url).protocol); } catch { return true; }
  })) return null;
  return { specs, condition: { grade, summary, attributes, images, image_captions: [...captions as string[], ...Array(images.length - captions.length).fill("")] }, accessories };
}
