export interface AuctionProductDetails {
  specs: Array<{ label: string; value: string }>;
  condition: {
    grade: "S" | "A" | "B" | "C" | "D";
    summary: string[];
    attributes: Array<{ label: string; value: string }>;
    images: string[];
    image_captions: string[];
  };
  accessories: string[];
}

const MAX_ROWS = 20;
const MAX_TEXT_LENGTH = 500;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 && text.length <= MAX_TEXT_LENGTH ? text : null;
}

function cleanRows(value: unknown): Array<{ label: string; value: string }> | null {
  if (!Array.isArray(value) || value.length > MAX_ROWS) return null;
  const rows: Array<{ label: string; value: string }> = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const label = cleanText(item.label);
    const rowValue = cleanText(item.value);
    if (!label || !rowValue) return null;
    rows.push({ label, value: rowValue });
  }
  return rows;
}

export function parseAuctionProductDetails(value: unknown): AuctionProductDetails | null {
  if (!isRecord(value)) return null;

  const specs = cleanRows(value.specs);
  const accessories = Array.isArray(value.accessories) && value.accessories.length <= MAX_ROWS
    ? value.accessories.map(cleanText)
    : null;
  const condition = isRecord(value.condition) ? value.condition : null;
  const grade = condition && ["S", "A", "B", "C", "D"].includes(condition.grade as string)
    ? condition.grade as AuctionProductDetails["condition"]["grade"]
    : null;
  const summary = condition && Array.isArray(condition.summary) && condition.summary.length <= MAX_ROWS
    ? condition.summary.map(cleanText)
    : null;
  const attributes = condition ? cleanRows(condition.attributes) : null;
  const images = condition && condition.images !== undefined && Array.isArray(condition.images) && condition.images.length <= MAX_ROWS
    ? condition.images.map(cleanText)
    : condition?.images === undefined ? [] : null;
  const imageCaptions = condition?.image_captions === undefined
    ? images ? Array(images.length).fill("") : null
    : cleanCaptions(condition.image_captions, images?.length ?? 0);

  if (!specs || !accessories || accessories.some((item) => !item) || !grade || !summary || summary.some((item) => !item) || !attributes || !images || !imageCaptions || images.some((url) => !url || !isHttpUrl(url))) {
    return null;
  }

  return {
    specs,
    accessories: accessories as string[],
    condition: {
      grade,
      summary: summary as string[],
      attributes,
      images: images as string[],
      image_captions: imageCaptions,
    },
  };
}

function cleanCaptions(value: unknown, imageCount: number): string[] | null {
  if (!Array.isArray(value) || value.length > MAX_ROWS || value.length > imageCount) return null;
  const captions = value.map((caption) => {
    if (typeof caption !== "string" || caption.trim().length > MAX_TEXT_LENGTH) return null;
    return caption.trim();
  });
  return captions.some((caption) => caption === null)
    ? null
    : [...captions as string[], ...Array(imageCount - captions.length).fill("")];
}

function isHttpUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function hasAuctionProductDetails(details: AuctionProductDetails | null | undefined): boolean {
  return Boolean(details && (
    details.specs.length ||
    details.condition.grade ||
    details.condition.summary.length ||
    details.condition.attributes.length ||
    details.accessories.length
  ));
}
