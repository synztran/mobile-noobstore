import { getProductAddonDeals } from "@/modules/products/server/ssr";
import { FrequentlyBoughtTogether } from "@/modules/products/ui/product/FrequentlyBoughtTogether";
import type { ProductDetail } from "@/modules/products/types";

export async function BoughtTogetherSection({
  product,
}: {
  product: ProductDetail;
}) {
  const addonDeals = await getProductAddonDeals(product.id);
  if (addonDeals.length === 0) return null;

  return (
    <FrequentlyBoughtTogether currentProduct={product} deals={addonDeals} />
  );
}
