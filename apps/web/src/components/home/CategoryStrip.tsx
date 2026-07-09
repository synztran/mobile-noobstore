import { CATEGORIES } from "@/lib/data";
import Link from "next/link";

export function CategoryStrip() {
  return (
    <section className="px-6">
      <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={`/shop?category=${encodeURIComponent(cat.toLowerCase())}`}
            className="flex-shrink-0 rounded-full border border-primary/20 bg-primary/5 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-primary transition-all hover:bg-primary hover:text-on-primary active:scale-95"
          >
            {cat}
          </Link>
        ))}
      </div>
    </section>
  );
}
