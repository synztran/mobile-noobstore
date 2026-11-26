import { formatVND } from "@/lib/currency";
import {
  getFlashSaleProducts,
  type FlashSaleProduct,
} from "@/modules/products/server/flash-sale";
import Image from "@/components/ui/AdaptiveImage";
import Link from "next/link";
import { SaleCountdown } from "@/modules/products/ui/product/SaleCountdown";
import { withHomeDataFallback } from "@/lib/home-render-data";

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
      className="group w-[180px] flex-shrink-0 transition-transform active:scale-95 lg:w-full lg:flex-shrink"
    >
      <div className="relative mb-2.5 aspect-square overflow-hidden rounded-2xl bg-surface-container-high lg:aspect-[4/5]">
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
    <div className="mb-6 flex items-center justify-between px-4 lg:mb-5 lg:px-0">
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

function FeaturedFlashSale({ product }: { product: FlashSaleProduct }) {
  const discountPercent =
    product.base_price > 0 && product.min_price < product.base_price
      ? Math.round(
          ((product.base_price - product.min_price) / product.base_price) * 100
        )
      : 0;

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group grid min-w-0 grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-center gap-5 rounded-2xl bg-surface-container-low p-4 transition-colors hover:bg-surface-container"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-container-high">
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 24vw, 40vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl font-black text-on-surface/10">
            {product.name.charAt(0)}
          </div>
        )}
        {discountPercent > 0 && (
          <span className="absolute left-2 top-2 rounded-md bg-red-500 px-2 py-1 text-xs font-bold text-white">
            -{discountPercent}%
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">
          Ưu đãi nổi bật
        </p>
        <h3 className="line-clamp-2 text-lg font-black leading-snug text-on-surface">
          {product.name}
        </h3>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-xl font-black text-red-600">
            {formatVND(product.min_price)}
          </span>
          {discountPercent > 0 && (
            <span className="text-sm text-on-surface-variant line-through">
              {formatVND(product.base_price)}
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
          <span>Kết thúc sau</span>
          <SaleCountdown endsAt={product.sale_ends_at} />
        </div>
        <span className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-xs font-bold text-on-primary">
          Xem ưu đãi
        </span>
      </div>
    </Link>
  );
}

function FlashSaleListItem({ product }: { product: FlashSaleProduct }) {
  const discountPercent =
    product.base_price > 0 && product.min_price < product.base_price
      ? Math.round(
          ((product.base_price - product.min_price) / product.base_price) * 100
        )
      : 0;

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group flex min-w-0 items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface-container-low"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-container-high">
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt=""
            fill
            sizes="64px"
            className="object-cover"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-2xl font-black text-on-surface/10">
            {product.name.charAt(0)}
          </span>
        )}
      </div>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-on-surface">
          {product.name}
        </span>
        <span className="mt-1 flex items-center gap-2">
          <span className="text-sm font-extrabold text-red-600">
            {formatVND(product.min_price)}
          </span>
          {discountPercent > 0 && (
            <span className="text-xs text-on-surface-variant line-through">
              {formatVND(product.base_price)}
            </span>
          )}
        </span>
      </span>
      {discountPercent > 0 && (
        <span className="shrink-0 rounded-md bg-error/10 px-2 py-1 text-xs font-bold text-error">
          -{discountPercent}%
        </span>
      )}
    </Link>
  );
}

export async function FlashSaleStrip() {
  const products = await withHomeDataFallback(
    "flash-sale rail",
    getFlashSaleProducts,
    [],
  );

  // Render nothing when no active flash sale — no empty rail on the homepage.
  if (products.length === 0) return null;

  return (
    <section className="bg-surface py-12 lg:rounded-3xl lg:p-8">
      <FlashSaleTimerHeader endsAt={products[0].sale_ends_at} />
      <div className="hide-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 lg:hidden">
        {products.map((product) => (
          <FlashSaleCard key={product.id} product={product} />
        ))}
      </div>
      <div className="hidden gap-5 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <FeaturedFlashSale product={products[0]} />
        <div className="flex min-w-0 flex-col justify-center divide-y divide-outline-variant/40">
          {products.slice(1, 5).map((product) => (
            <FlashSaleListItem key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
