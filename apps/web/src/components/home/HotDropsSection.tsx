import { getBestSellers } from "@/modules/products/server/ssr";
import { ArrowRight, Flame } from "lucide-react";
import Link from "next/link";
import { BundleProductCard } from "./BundleProductCard";

export async function HotDropsSection() {
  const products = await getBestSellers(5);

  if (products.length === 0) return null;

  return (
    <section className="rounded-md bg-surface md:p-4 lg:rounded-3xl lg:p-4">
      <div className="mb-4 flex items-center justify-between gap-4 px-0">
        <h2 className="flex items-center gap-2 text-xl font-black uppercase tracking-tight text-on-surface lg:text-2xl">
          <Flame
            size={20}
            className="fill-primary text-primary"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          Bán chạy nhất
        </h2>
        <Link
          href="/shop"
          className="group flex shrink-0 items-center gap-1 whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-primary transition-all hover:gap-2"
        >
          Xem tất cả
          <ArrowRight size={10} />
        </Link>
      </div>

      <div className="hide-scrollbar flex gap-4 overflow-x-auto px-0 pb-2 lg:snap-x lg:gap-5 lg:pb-2">
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[180px] shrink-0 snap-start lg:w-[calc((100%-3*1.25rem)/3.5)]"
          >
            <BundleProductCard
              product={product}
              showSoldOutOverlay
              showSoldCount
            />
          </div>
        ))}
      </div>
    </section>
  );
}
