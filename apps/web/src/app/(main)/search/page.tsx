import type { SortOption } from "@/modules/products/types";
import { SearchPageClient } from "@/modules/products/ui/search/SearchPageClient";
import { getProducts } from "@/modules/products/server/ssr";
import { Suspense } from "react";
import type { Metadata } from "next";
import { buildOg } from "@/lib/og";

interface SearchPageProps {
  searchParams: Promise<{ q?: string; sort?: string }>;
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const term = q?.trim();
  // No " - NoobStore" suffix: the root layout's title template adds it.
  const title = term ? `Tìm kiếm: "${term}"` : "Tìm kiếm sản phẩm";
  return buildOg({
    title,
    description: term
      ? `Kết quả tìm kiếm cho "${term}" tại NoobStore`
      : "Tìm kiếm sản phẩm bàn phím cơ, switch và phụ kiện tại NoobStore",
    // Canonical strips the query so every search variant points at one URL.
    url: "/search",
  });
}

const PAGE_SIZE = 24;

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = "", sort } = await searchParams;

  const initialData = q
    ? await getProducts({
        search: q,
        sort: (sort as SortOption) ?? "newest",
        limit: PAGE_SIZE,
        offset: 0,
        slim: true,
        // /search pages come from the same /api/products endpoint as /shop,
        // which sinks sold-out items. Match it here or the SSR payload and the
        // first fetched page would order differently.
        soldOutLast: true,
      })
    : null;

  return (
    <div className="p-4 pb-28">
      <div className="mb-6 text-center">
        <p className="text-2xl font-black tracking-tight text-on-surface">
          Tìm kiếm
        </p>
        {q && (
          <p className="mt-1 text-sm font-medium text-on-surface-variant">
            Kết quả cho &quot;{q}&quot;
          </p>
        )}
      </div>

      <Suspense fallback={null}>
        <SearchPageClient
          initialData={initialData}
          query={q}
          initialSort={sort as SortOption}
        />
      </Suspense>
    </div>
  );
}
