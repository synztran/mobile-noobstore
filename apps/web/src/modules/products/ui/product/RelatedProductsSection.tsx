import { ProductRail } from "@/modules/products/ui/product/ProductRail";
import { getRelatedProducts } from "@/modules/products/server/ssr";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export async function RelatedProductsSection({
  brand,
  slug,
}: {
  brand: string | null;
  slug: string;
}) {
  const relatedProducts = await getRelatedProducts(brand, slug, 8);

  if (relatedProducts.length === 0) return null;

  return (
    <ProductRail
      title="Sản phẩm liên quan"
      cardWidth="w-[160px]"
      trailing={
        brand && (
          <Link
            href={`/shop?brand=${encodeURIComponent(brand)}`}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary transition-all hover:gap-2"
          >
            Xem tất cả
            <ArrowRight size={10} />
          </Link>
        )
      }
      products={relatedProducts}
      classNames="px-4"
    />
  );
}
