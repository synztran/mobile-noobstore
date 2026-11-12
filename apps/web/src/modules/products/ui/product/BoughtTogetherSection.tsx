import {
  getFrequentlyBoughtTogether,
  getProductAddonDeals,
  getRelatedProducts,
} from "@/modules/products/server/ssr";
import { FrequentlyBoughtTogether } from "@/modules/products/ui/product/FrequentlyBoughtTogether";
import type { ProductDetail } from "@/modules/products/types";

export async function BoughtTogetherSection({
  product,
}: {
  product: ProductDetail;
}) {
  // 1. Try manual admin configured addon deals first
  const addonDeals = await getProductAddonDeals(product.id);

  if (addonDeals.length > 0) {
    return (
      <FrequentlyBoughtTogether
        currentProduct={product}
        deals={addonDeals}
      />
    );
  }

  // 2. Fallback to order co-occurrence or related brand products
  let fallbackItems = await getFrequentlyBoughtTogether(product.id, 4);

  if (fallbackItems.length === 0 && product.brand) {
    fallbackItems = await getRelatedProducts(product.brand, product.slug, 4);
  }

  // Filter out the current product itself
  fallbackItems = fallbackItems.filter((p) => p.id !== product.id);

  if (fallbackItems.length === 0) return null;

  return (
    <FrequentlyBoughtTogether
      currentProduct={product}
      fallbackProducts={fallbackItems}
    />
  );
}
