import { ProductRail } from "@/components/product/ProductRail";
import { getFrequentlyBoughtTogether } from "@/lib/products-server";

export async function BoughtTogetherSection({
  productId,
}: {
  productId: string;
}) {
  const boughtTogether = await getFrequentlyBoughtTogether(productId);

  if (boughtTogether.length === 0) return null;

  return (
    <ProductRail
      title="Thường được mua cùng"
      icon={
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 text-primary"
          fill="currentColor"
        >
          <path d="M16 6l2.29 2.29-9.88 9.88-4-4L10 12l4.71-4.71L16 6zm0-2.83l-3.29 3.29-4.71 4.71-4.71-4.71L0 6l10 10 10-10-4-4.83z" />
        </svg>
      }
      products={boughtTogether}
    />
  );
}
