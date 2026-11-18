export interface TestimonialInput {
  name: string | null;
  product: string | null;
  rating: number;
  text: string;
  date: string;
  image_url: string | null;
  is_active: boolean;
  order: number;
}

export type ValidationResult =
  | { success: true; data: TestimonialInput }
  | { success: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function optionalText(value: unknown, field: string, max: number) {
  if (value === null || value === undefined)
    return { value: null, error: null };
  if (typeof value !== "string")
    return { value: null, error: `${field} must be text` };
  const text = value.trim();
  if (text.length > max) return { value: null, error: `${field} is too long` };
  return { value: text || null, error: null };
}

export function parseTestimonialInput(
  input: unknown,
  partial = false
): ValidationResult | { success: true; data: Partial<TestimonialInput> } {
  if (!isRecord(input)) return { success: false, error: "Invalid JSON object" };

  const result: Partial<TestimonialInput> = {};
  const allowed = [
    "name",
    "product",
    "rating",
    "text",
    "date",
    "image_url",
    "is_active",
    "order",
  ];
  if (Object.keys(input).some((key) => !allowed.includes(key))) {
    return { success: false, error: "Unknown testimonial field" };
  }
  if (
    partial &&
    Object.keys(input).some(
      (key) =>
        ![
          "name",
          "product",
          "rating",
          "text",
          "date",
          "image_url",
          "is_active",
          "order",
        ].includes(key)
    )
  ) {
    return { success: false, error: "Unknown testimonial field" };
  }
  const assignOptional = (
    key: "name" | "product" | "image_url",
    max: number
  ) => {
    if (!(key in input)) return null;
    const parsed = optionalText(input[key], key, max);
    if (parsed.error) return parsed.error;
    if (key === "image_url" && parsed.value) {
      try {
        const url = new URL(parsed.value);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          return "image_url must use HTTP or HTTPS";
        }
      } catch {
        return "image_url must be an absolute HTTP(S) URL";
      }
    }
    result[key] = parsed.value;
    return null;
  };

  const nameError = assignOptional("name", 120);
  if (nameError) return { success: false, error: nameError };
  const productError = assignOptional("product", 160);
  if (productError) return { success: false, error: productError };
  const imageError = assignOptional("image_url", 2048);
  if (imageError) return { success: false, error: imageError };

  if ("rating" in input || !partial) {
    if (
      typeof input.rating !== "number" ||
      !Number.isInteger(input.rating) ||
      input.rating < 1 ||
      input.rating > 5
    ) {
      return { success: false, error: "rating must be an integer from 1 to 5" };
    }
    result.rating = input.rating;
  }

  if ("text" in input || !partial) {
    if (typeof input.text !== "string" || !input.text.trim()) {
      return { success: false, error: "text is required" };
    }
    if (input.text.trim().length > 5000) {
      return { success: false, error: "text is too long" };
    }
    result.text = input.text.trim();
  }

  if ("date" in input || !partial) {
    if (
      typeof input.date !== "string" ||
      !input.date.trim() ||
      input.date.trim().length > 40
    ) {
      return {
        success: false,
        error: "date is required and must be at most 40 characters",
      };
    }
    result.date = input.date.trim();
  }

  if ("is_active" in input || !partial) {
    if (typeof input.is_active !== "boolean") {
      return { success: false, error: "is_active must be a boolean" };
    }
    result.is_active = input.is_active;
  }

  if ("order" in input || !partial) {
    if (
      typeof input.order !== "number" ||
      !Number.isSafeInteger(input.order) ||
      input.order < 0
    ) {
      return { success: false, error: "order must be a non-negative integer" };
    }
    result.order = input.order;
  }

  if (partial && Object.keys(result).length === 0) {
    return { success: false, error: "At least one field is required" };
  }

  return { success: true, data: result as TestimonialInput };
}
