import type { ConfiguratorVariant } from "@/modules/products/types";

/** Sort selectable component variants by purchase availability, preserving
 * source order within each availability tier. */
export function sortConfiguratorVariants<T extends ConfiguratorVariant>(
  variants: T[]
): T[] {
  const tier = (variant: ConfiguratorVariant) => {
    if (variant.is_pre_order) return 1;
    if (variant.stock_quantity > 0) return 0;
    return 2;
  };

  return variants
    .map((variant, index) => ({ variant, index }))
    .sort((a, b) => tier(a.variant) - tier(b.variant) || a.index - b.index)
    .map(({ variant }) => variant);
}
