import {
  getProductAddonDeals,
  getFrequentlyBoughtTogether,
  getRelatedProducts,
} from "@/modules/products/server/ssr";
import { AddonDealTeaser } from "@/modules/products/ui/product/AddonDealTeaser";
import type { ProductDetail } from "@/modules/products/types";

export async function AddonDealTeaserSection({
  product,
}: {
  product: ProductDetail;
}) {
  const deals = await getProductAddonDeals(product.id);

  if (deals.length > 0) {
    return <AddonDealTeaser deals={deals} />;
  }

  let fallback = await getFrequentlyBoughtTogether(product.id, 3);
  if (fallback.length === 0 && product.brand) {
    fallback = await getRelatedProducts(product.brand, product.slug, 3);
  }
  fallback = fallback.filter((p) => p.id !== product.id);

  if (fallback.length === 0) return null;

  return <AddonDealTeaser deals={[]} fallbackProducts={fallback} />;
}
