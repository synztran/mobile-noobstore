import type { ProductSeoInfo } from "@/modules/products/server/ssr";
import { headers } from "next/headers";

export async function ShopSeo({
  products,
}: {
  products: ProductSeoInfo[];
}) {
  const headersList = await headers();
  const host = headersList.get("host") ?? "noobstore.vn";
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const itemListElement = products.map((p, i) => ({
    "@type": "ListItem" as const,
    position: i + 1,
    item: {
      "@type": "Product" as const,
      name: p.name,
      image: p.thumbnail ? `${baseUrl}${p.thumbnail}` : undefined,
      offers: {
        "@type": "Offer" as const,
        price: p.base_price,
        priceCurrency: "VND" as const,
      },
      url: `${baseUrl}/shop/${p.slug}`,
    },
  }));

  const structured = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(structured) }}
    />
  );
}
import { safeJsonLd } from "@/lib/safe-html";
