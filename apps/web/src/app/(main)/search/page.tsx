import type { SortOption } from "@/modules/products/types";
import { SearchPageClient } from "@/modules/products/ui/search/SearchPageClient";
import { getProducts } from "@/modules/products/server/ssr";
import { Suspense } from "react";
import type { Metadata } from "next";

interface SearchPageProps {
  searchParams: Promise<{ q?: string; sort?: string }>;
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const title = q
    ? `Tìm kiếm: "${q}" - NoobStore`
    : "Tìm kiếm sản phẩm - NoobStore";
  return {
    title,
    description: q
      ? `Kết quả tìm kiếm cho "${q}" tại NoobStore`
      : "Tìm kiếm sản phẩm bàn phím cơ, switch và phụ kiện tại NoobStore",
    openGraph: { title, siteName: "NoobStore" },
  };
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
