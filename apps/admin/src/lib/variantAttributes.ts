/**
 * Build the `product_variants.attributes` JSONB payload from an existing
 * attributes map + the "Tình trạng" (condition) and "color" fields.
 * Empty values remove their keys; empty map serializes to null.
 */
export function buildVariantAttributes(
  existing: Record<string, string> | null | undefined,
  condition: string,
  color?: string
): Record<string, string> | null {
  const merged: Record<string, string> = { ...(existing ?? {}) };
  const trimmedCondition = condition.trim();
  if (trimmedCondition) {
    merged["Tình trạng"] = trimmedCondition;
  } else {
    delete merged["Tình trạng"];
  }
  if (color !== undefined) {
    const trimmedColor = color.trim();
    if (trimmedColor) {
      merged["color"] = trimmedColor;
    } else {
      delete merged["color"];
    }
  }
  return Object.keys(merged).length > 0 ? merged : null;
}
