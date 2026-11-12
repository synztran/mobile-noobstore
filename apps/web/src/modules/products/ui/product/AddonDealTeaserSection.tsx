import { getProductAddonDeals } from "@/modules/products/server/ssr";
import { AddonDealTeaser } from "@/modules/products/ui/product/AddonDealTeaser";
import type { ProductDetail } from "@/modules/products/types";

export async function AddonDealTeaserSection({
  product,
}: {
  product: ProductDetail;
}) {
  const deals = await getProductAddonDeals(product.id);

  if (deals.length === 0) return null;

  return <AddonDealTeaser deals={deals} />;
}
