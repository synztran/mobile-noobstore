import { formatVND } from "@/lib/currency";
import {
  getFlashSaleProducts,
  type FlashSaleProduct,
} from "@/modules/products/server/flash-sale";
import Image from "@/components/ui/AdaptiveImage";
import Link from "next/link";
import { SaleCountdown } from "@/modules/products/ui/product/SaleCountdown";

function FlashSaleCard({ product }: { product: FlashSaleProduct }) {
  const discountPercent =
    product.base_price > 0 && product.min_price < product.base_price
      ? Math.round(
          ((product.base_price - product.min_price) / product.base_price) * 100
        )
      : 0;
  const lowStock =
    product.stock_quantity !== null &&
    product.stock_quantity > 0 &&
    product.stock_quantity <= 5;

  return (
    <Link
        href={`/shop/${product.slug}`}
        className="group w-[180px] flex-shrink-0 transition-transform active:scale-95"
      >
      <div className="relative mb-2.5 aspect-square overflow-hidden rounded-2xl bg-surface-container-high">
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="160px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-[4rem] font-black uppercase leading-none text-on-surface/5">
              {product.name.charAt(0)}
            </span>
          </div>
        )}

        {discountPercent > 0 && (
          <div className="absolute left-3 top-3 rounded-md bg-red-500 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            -{discountPercent}%
          </div>
        )}

        <div className="absolute bottom-3 left-3">
          <SaleCountdown endsAt={product.sale_ends_at} />
        </div>

        {lowStock && (
          <div className="absolute right-3 top-3 rounded-md bg-on-surface px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-surface">
            Chỉ còn {product.stock_quantity}
          </div>
        )}
      </div>

      <p className="line-clamp-2 min-h-[35px] text-sm font-bold uppercase leading-tight tracking-tight">
        {product.name}
      </p>

      <div className="mt-1 space-y-0.5">
        {discountPercent > 0 && (
          <p className="text-xs font-bold text-on-surface-variant/70 line-through">
            {formatVND(product.base_price)}
          </p>
        )}
        <p
          className={`font-extrabold ${
            discountPercent > 0 ? "text-red-500" : "text-primary"
          } text-sm`}
        >
          {formatVND(product.min_price)}
        </p>
      </div>
    </Link>
  );
}

function FlashSaleTimerHeader({ endsAt }: { endsAt: string }) {
  return (
    <div className="mb-6 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold uppercase tracking-tight">
          Flash Sale
        </h2>
        <SaleCountdown endsAt={endsAt} />
      </div>
      <Link
        href="/shop"
        className="text-[11px] font-semibold uppercase tracking-wide text-primary"
      >
        Xem tất cả →
      </Link>
    </div>
  );
}

export async function FlashSaleStrip() {
  const products = await getFlashSaleProducts();

  // Render nothing when no active flash sale — no empty rail on the homepage.
  if (products.length === 0) return null;

  return (
    <section className="bg-surface py-12">
      <FlashSaleTimerHeader endsAt={products[0].sale_ends_at} />
      <div className="hide-scrollbar flex gap-4 overflow-x-auto px-6 pb-2">
        {products.map((product) => (
          <FlashSaleCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
