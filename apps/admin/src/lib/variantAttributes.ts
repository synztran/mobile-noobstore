/**
 * Build the `product_variants.attributes` JSONB payload from an existing
 * attributes map + the "Tình trạng" (condition) text field.
 * Empty condition removes the key; empty map serializes to null.
 */
export function buildVariantAttributes(
  existing: Record<string, string> | null | undefined,
  condition: string
): Record<string, string> | null {
  const merged: Record<string, string> = { ...(existing ?? {}) };
  const trimmed = condition.trim();
  if (trimmed) {
    merged["Tình trạng"] = trimmed;
  } else {
    delete merged["Tình trạng"];
  }
  return Object.keys(merged).length > 0 ? merged : null;
}
