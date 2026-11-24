import ProductComponentGroupCard from "@/components/product-components/ProductComponentGroupCard";
import ProductComponentsHeader from "@/components/product-components/ProductComponentsHeader";
import type {
  ProductComponentGroup,
  ProductComponentRow,
  ProductOption,
} from "@/components/product-components/types";
import { getAdminClient } from "@/lib/supabase/admin";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Product Components - NoobStore Admin",
};

const PAGE_SIZE = 20;

export default async function ProductComponentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; by?: string; page?: string }>;
}) {
  const { q, by, page } = await searchParams;
  const searchBy = by === "component" ? "component" : "parent";
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const supabase = getAdminClient();

  // Bounded: grouping/pagination for this page happens client-side (see the
  // filteredRows/grouped reduce below), so the DB result is capped to keep the
  // unbounded scan from growing with the products table.
  const PRODUCT_OPTIONS_LIMIT = 500;
  const { data: productOptions } = await supabase
    .from("products")
    .select(
      "id, name, product_type, thumbnail, base_price, stock_quantity, brand, is_active"
    )
    .order("name", { ascending: true })
    .limit(PRODUCT_OPTIONS_LIMIT);

  const { data: components, error } = await supabase
    .from("product_components")
    .select(
      `
			id, parent_product_id, component_product_id, component_group, is_required, max_quantity,
			parent_product:products!product_components_parent_product_id_fkey(id, name, product_type, thumbnail, base_price, stock_quantity, brand),
			component_product:products!product_components_component_product_id_fkey(id, name, product_type, thumbnail, base_price, stock_quantity, brand)
		`
    )
    .order("component_group", { ascending: true })
    .limit(1000);

  if (error) {
    console.error("Error fetching product components:", error);
  }

  const rows = (components ?? []) as unknown as ProductComponentRow[];
  const normalizedQuery = q?.trim().toLowerCase() ?? "";

  const filteredRows = normalizedQuery
    ? rows.filter((row) => {
        const parentName = row.parent_product?.name.toLowerCase() ?? "";
        const componentName = row.component_product?.name.toLowerCase() ?? "";
        return searchBy === "component"
          ? componentName.includes(normalizedQuery)
          : parentName.includes(normalizedQuery);
      })
    : rows;

  const grouped = filteredRows.reduce<Record<string, ProductComponentGroup>>(
    (acc, row) => {
      const groupKey =
        row.parent_product_id ?? row.parent_product?.id ?? row.id;
      if (!acc[groupKey]) {
        acc[groupKey] = {
          parent_product_id: groupKey,
          parent_product: row.parent_product,
          components: [],
        };
      }
      acc[groupKey].components.push(row);
      return acc;
    },
    {}
  );

  const groupedRows = Object.values(grouped);
  const totalPages = Math.max(1, Math.ceil(groupedRows.length / PAGE_SIZE));
  const pageGroups = groupedRows.slice(from, to + 1);

  const buildUrl = (nextPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (searchBy) params.set("by", searchBy);
    params.set("page", String(nextPage));
    return `/products/components?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <ProductComponentsHeader
        products={(productOptions ?? []) as ProductOption[]}
        searchBy={searchBy}
      />

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load components.
        </div>
      )}

      <div className="grid w-full grid-cols-2 gap-4">
        {pageGroups.length > 0 ? (
          pageGroups.map((group) => (
            <ProductComponentGroupCard
              key={group.parent_product_id}
              group={group}
              products={(productOptions ?? []) as ProductOption[]}
            />
          ))
        ) : (
          <div className="col-span-full rounded-lg bg-white px-6 py-12 text-center text-slate-500 shadow">
            No product components found
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-slate-500">
            {groupedRows.length} parent group
            {groupedRows.length !== 1 ? "s" : ""} · Page {currentPage} of{" "}
            {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Link
              href={buildUrl(currentPage - 1)}
              aria-disabled={currentPage === 1}
              className={`rounded-lg border border-slate-200 p-1.5 ${
                currentPage === 1
                  ? "pointer-events-none opacity-40"
                  : "hover:bg-slate-100"
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1
              )
              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                  acc.push("…");
                }
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…" ? (
                  <span
                    key={`ellipsis-${i}`}
                    className="px-2 text-sm text-slate-400"
                  >
                    …
                  </span>
                ) : (
                  <Link
                    key={p}
                    href={buildUrl(p)}
                    className={`flex h-8 min-w-[2rem] items-center justify-center rounded-lg border text-sm ${
                      p === currentPage
                        ? "border-blue-600 bg-blue-600 font-medium text-white"
                        : "border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {p}
                  </Link>
                )
              )}
            <Link
              href={buildUrl(currentPage + 1)}
              aria-disabled={currentPage === totalPages}
              className={`rounded-lg border border-slate-200 p-1.5 ${
                currentPage === totalPages
                  ? "pointer-events-none opacity-40"
                  : "hover:bg-slate-100"
              }`}
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
