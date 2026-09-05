import { CalendarDays } from "lucide-react";
import Image from "@/components/ui/AdaptiveImage";
import Link from "next/link";
import { formatVND } from "@/lib/currency";
import { getSaleProducts } from "@/modules/products/server/sale";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tin tức - NoobStore",
  description:
    "Tất cả tin tức trong một nơi: khuyến mãi, group buy, bàn phím/keycap/artisan mới và bài viết từ NoobStore.",
  openGraph: {
    title: "Tin tức - NoobStore",
    description:
      "Khuyến mãi, sản phẩm mới từ các hãng và bài viết về bàn phím cơ — tất cả trong một trang.",
    siteName: "NoobStore",
  },
};

type BlogItem = {
  kind: "blog";
  id: string;
  title: string;
  excerpt: string | null;
  category: string;
  slug: string;
  thumbnail: string | null;
  date: string;
};

type ReleaseItem = {
  kind: "release";
  id: string;
  title: string;
  excerpt: string | null;
  releaseType: string;
  makerName: string | null;
  sourceUrl: string | null;
  thumbnail: string | null;
  date: string;
};

type SaleItem = {
  kind: "sale";
  id: string;
  name: string;
  slug: string;
  thumbnail: string | null;
  basePrice: number;
  salePrice: number;
  discountPercent: number;
  date: string;
};

export type NewsItem = BlogItem | ReleaseItem | SaleItem;

const FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "sale", label: "Khuyến mãi" },
  { key: "release", label: "Sản phẩm mới" },
  { key: "blog", label: "Blog" },
] as const;

const RELEASE_TYPE_LABELS: Record<string, string> = {
  SALE: "Sale",
  GROUP_BUY: "Group Buy",
  NEW_RELEASE: "New Release",
};

const KIND_BADGE_STYLES: Record<NewsItem["kind"], string> = {
  sale: "bg-red-100 text-red-700",
  release: "bg-blue-100 text-blue-700",
  blog: "bg-primary/10 text-primary",
};

async function getBlogPosts(): Promise<BlogItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("id, slug, title, excerpt, category, thumbnail, published_at, created_at")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(20);

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    kind: "blog" as const,
    id: row.id as string,
    title: row.title as string,
    excerpt: (row.excerpt as string | null) ?? null,
    category: row.category as string,
    slug: row.slug as string,
    thumbnail: (row.thumbnail as string | null) ?? null,
    date:
      (row.published_at as string | null) ?? (row.created_at as string) ?? "",
  }));
}

async function getReleases(): Promise<ReleaseItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("maker_releases")
    .select("id, title, excerpt, type, maker_name, source_url, thumbnail, published_at")
    .order("published_at", { ascending: false })
    .limit(30);

  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map(
    (row) => ({
      kind: "release" as const,
      id: row.id as string,
      title: row.title as string,
      excerpt: (row.excerpt as string | null) ?? null,
      releaseType: (row.type as string) ?? "NEW_RELEASE",
      makerName: (row.maker_name as string | null) ?? null,
      sourceUrl: (row.source_url as string | null) ?? null,
      thumbnail: (row.thumbnail as string | null) ?? null,
      date: (row.published_at as string | null) ?? "",
    })
  );
}

async function getSales(): Promise<SaleItem[]> {
  const { products } = await getSaleProducts({ limit: 12 });
  return products.map((p) => ({
    kind: "sale" as const,
    id: p.id,
    name: p.name,
    slug: p.slug,
    thumbnail: p.thumbnail,
    basePrice: p.base_price,
    salePrice: p.min_price,
    discountPercent:
      p.base_price > 0 && p.min_price < p.base_price
        ? Math.round(((p.base_price - p.min_price) / p.base_price) * 100)
        : 0,
    date: "",
  }));
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

function Thumb({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-2xl bg-surface-container">
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, 50vw"
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <span className="text-5xl font-black uppercase text-on-surface/5">
            {alt.charAt(0)}
          </span>
        </div>
      )}
    </div>
  );
}

function Badge({ item }: { item: NewsItem }) {
  const style = KIND_BADGE_STYLES[item.kind];
  if (item.kind === "sale") {
    return (
      <span
        className={`inline-block rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style}`}
      >
        Khuyến mãi
      </span>
    );
  }
  if (item.kind === "release") {
    return (
      <span
        className={`inline-block rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style}`}
      >
        {RELEASE_TYPE_LABELS[item.releaseType] ?? "New Release"}
      </span>
    );
  }
  return (
    <span
      className={`inline-block rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style}`}
    >
      {item.category}
    </span>
  );
}

function MetaRow({ item }: { item: NewsItem }) {
  const date = item.kind === "sale" ? "" : formatDate(item.date);
  const extra =
    item.kind === "release"
      ? item.makerName
      : item.kind === "sale"
        ? `${formatVND(item.salePrice)}`
        : null;
  return (
    <div className="flex items-center gap-3 pt-1">
      {date && (
        <div className="flex items-center gap-1 text-[11px] font-semibold text-on-surface-variant/70">
          <CalendarDays size={12} />
          {date}
        </div>
      )}
      {extra && (
        <span className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant/70">
          {extra}
        </span>
      )}
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const body = (
    <>
      <Thumb src={item.thumbnail} alt={item.kind === "sale" ? item.name : item.title} />
      <div className="space-y-2 p-4">
        <Badge item={item} />
        <p className="line-clamp-2 text-sm font-black leading-snug text-on-surface transition-colors group-hover:text-primary">
          {item.kind === "sale" ? item.name : item.title}
        </p>
        {item.kind !== "sale" && item.excerpt && (
          <p className="line-clamp-2 text-xs font-medium text-on-surface-variant">
            {item.excerpt}
          </p>
        )}
        {item.kind === "sale" && item.discountPercent > 0 && (
          <div className="flex items-baseline gap-2 pt-1">
            <span className="rounded-md bg-red-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
              -{item.discountPercent}%
            </span>
            <span className="text-xs font-bold text-on-surface-variant/70 line-through">
              {formatVND(item.basePrice)}
            </span>
            <span className="text-sm font-extrabold text-red-500">
              {formatVND(item.salePrice)}
            </span>
          </div>
        )}
        <MetaRow item={item} />
      </div>
    </>
  );

  const className =
    "group block rounded-2xl border border-outline-variant/20 bg-surface-container-low transition-all hover:shadow-float active:scale-[0.99]";

  if (item.kind === "blog") {
    return (
      <Link href={`/blogs/${item.slug}`} className={className}>
        {body}
      </Link>
    );
  }
  if (item.kind === "sale") {
    return (
      <Link href={`/shop/${item.slug}`} className={className}>
        {body}
      </Link>
    );
  }
  // Releases have no detail page — deep-link to the source when available.
  if (item.sourceUrl) {
    return (
      <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className={className}>
        {body}
      </a>
    );
  }
  return <div className={className}>{body}</div>;
}

export default async function NewsPage(props: {
  searchParams: Promise<{ type?: string }>;
}) {
  const searchParams = await props.searchParams;
  const activeType = searchParams.type ?? "all";
  const validTypes = FILTERS.some((f) => f.key === activeType)
    ? activeType
    : "all";

  const [blogs, releases, sales] = await Promise.all([
    getBlogPosts(),
    getReleases(),
    getSales(),
  ]);

  let items: NewsItem[] = [...sales, ...releases, ...blogs];
  items.sort((a, b) => {
    const da = a.kind === "sale" ? "" : a.date;
    const db = b.kind === "sale" ? "" : b.date;
    return db.localeCompare(da);
  });

  if (validTypes !== "all") {
    items = items.filter((i) => i.kind === validTypes);
  }

  const counts: Record<string, number> = {
    all: sales.length + releases.length + blogs.length,
    sale: sales.length,
    release: releases.length,
    blog: blogs.length,
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 pb-28">
      <div className="mb-8 text-center">
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-primary">
          NoobStore News
        </p>
        <p className="text-2xl font-black tracking-tight text-on-surface">
          Tin tức &amp; Ưu đãi
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm font-medium text-on-surface-variant">
          Khuyến mãi, group buy, bàn phím &amp; keycap mới nhất và bài viết —
          tất cả trong một trang.
        </p>
      </div>

      {/* Filter chips */}
      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/news" : `/news?type=${f.key}`}
            className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              validTypes === f.key
                ? "bg-primary text-white"
                : "bg-surface-container text-on-surface-variant hover:bg-primary/10"
            }`}
          >
            {f.label} ({counts[f.key] ?? 0})
          </Link>
        ))}
      </div>

      {/* Feed */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-low px-5 py-10 text-center">
          <p className="text-sm font-semibold text-on-surface-variant">
            Chưa có tin tức nào ở mục này.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {items.map((item) => (
            <NewsCard key={`${item.kind}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </main>
  );
}
