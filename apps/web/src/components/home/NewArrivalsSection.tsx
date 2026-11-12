import {
  getNewestProducts,
  getNoteworthyProducts,
} from "@/modules/products/server/ssr";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { BundleProductCard } from "./BundleProductCard";

export async function NewArrivalsSection() {
  const [newest, featured] = await Promise.all([
    getNewestProducts(15),
    getNoteworthyProducts({ limit: 5 }),
  ]);

  // The featured rail already shows the newest five; skip them so this rail
  // widens the catalogue instead of repeating the same cards.
  const featuredIds = new Set(featured.products.map((product) => product.id));
  const fresh = newest.filter((product) => !featuredIds.has(product.id));
  // Lead with buyable stock so the rail never opens on sold-out cards.
  const inStock = fresh.filter((product) => product.stock_quantity > 0);
  const soldOut = fresh.filter((product) => product.stock_quantity === 0);
  const products = [...inStock, ...soldOut].slice(0, 5);

  if (products.length === 0) return null;

  return (
    <section className="bg-surface lg:rounded-3xl lg:p-8">
      <div className="mb-4 flex items-center justify-between gap-4 px-6 lg:px-0">
        <h2 className="text-xl font-black uppercase tracking-tight text-on-surface lg:text-2xl">
          Hàng mới về
        </h2>
        <Link
          href="/shop?sort=newest"
          className="group flex shrink-0 items-center gap-1 whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-primary transition-all hover:gap-2"
        >
          Xem tất cả
          <ArrowRight size={10} />
        </Link>
      </div>

      <div className="hide-scrollbar flex snap-x gap-4 overflow-x-auto px-6 pb-2 lg:gap-5 lg:px-0 lg:pb-2">
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[min(62vw,260px)] shrink-0 snap-start sm:w-[min(46vw,280px)] lg:w-[calc((100%-3*1.25rem)/3.5)]"
          >
            <BundleProductCard
              product={product}
              showNewBadge
              showSoldOutOverlay
            />
          </div>
        ))}
      </div>
    </section>
  );
}
