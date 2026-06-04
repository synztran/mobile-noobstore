import EditVariantModal from "@/components/variants/EditVariantModal";
import VariantsHeader from "@/components/variants/VariantsHeader";
import { getAdminClient } from "@/lib/supabase/admin";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Product Variants - NoobStore Admin",
};

const PAGE_SIZE = 25;

export default async function ProductVariantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; by?: string }>;
}) {
  const { q, page, by } = await searchParams;
  const searchBy = by === "product" ? "product" : "variant";
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = getAdminClient();

  const { data: products } = await supabase
    .from("products")
    .select(
      "id, name, product_type, base_price, stock_quantity, thumbnail, brand"
    )
    .eq("product_type", "component")
    .order("name", { ascending: true });

  let query = supabase
    .from("product_variants")
    .select(
      `
			id, variant_name, price_adjustment, stock_quantity, is_pre_order, attributes, thumbnail, product_id,
			products(id, name, product_type, slug)
		`,
      { count: "exact" }
    )
    .order("variant_name", { ascending: true })
    .range(from, to);

  if (q) {
    if (searchBy === "product") {
      // Resolve matching product IDs first, then filter variants
      const { data: matchedProducts } = await supabase
        .from("products")
        .select("id")
        .ilike("name", `%${q}%`);
      const ids = (matchedProducts ?? []).map((p) => p.id);
      if (ids.length === 0) {
        query = query.in("product_id", ["__no_match__"]);
      } else {
        query = query.in("product_id", ids);
      }
    } else {
      query = query.ilike("variant_name", `%${q}%`);
    }
  }

  const { data: variants, error, count } = await query;

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const buildUrl = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("by", searchBy);
    params.set("page", String(p));
    return `/products/variants?${params.toString()}`;
  };

  if (error) {
    console.error("Error fetching product variants:", error);
  }

  return (
    <div className="space-y-6">
      <VariantsHeader products={products ?? []} searchBy={searchBy} />

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load variants.
        </div>
      )}

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Variant
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Product
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Price Adj.
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Attributes
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Pre-order
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {variants && variants.length > 0 ? (
              variants.map((v) => {
                const product = v.products as {
                  name: string;
                  product_type: string;
                  thumbnail?: string | null;
                  brand?: string | null;
                  base_price?: number;
                  stock_quantity?: number | null;
                  slug?: string;
                } | null;
                const attrs =
                  v.attributes &&
                  typeof v.attributes === "object" &&
                  !Array.isArray(v.attributes)
                    ? (v.attributes as Record<string, string>)
                    : null;
                return (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {v.variant_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div>{product?.name ?? "—"}</div>
                      {product?.product_type && (
                        <div className="text-xs text-slate-400">
                          {product.product_type}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {v.price_adjustment === null ||
                      v.price_adjustment === 0 ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span
                          className={
                            v.price_adjustment > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {v.price_adjustment > 0 ? "+" : ""}
                          {v.price_adjustment.toLocaleString("vi-VN")}₫
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {v.stock_quantity ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {attrs
                        ? Object.entries(attrs)
                            .map(([k, val]) => `${k}: ${val}`)
                            .join(", ")
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {v.is_pre_order ? (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                          Yes
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <EditVariantModal
                        variant={{
                          id: v.id,
                          variant_name: v.variant_name,
                          price_adjustment: v.price_adjustment,
                          stock_quantity: v.stock_quantity,
                          is_pre_order: v.is_pre_order,
                          thumbnail:
                            (v as { thumbnail?: string | null }).thumbnail ??
                            null,
                          attributes: attrs,
                          product_id:
                            (v as { product_id?: string }).product_id ?? "",
                          product_name: product?.name ?? "",
                          product_type: product?.product_type,
                          product_thumbnail: product?.thumbnail,
                          product_brand: product?.brand,
                          product_base_price: product?.base_price,
                          product_stock_quantity: product?.stock_quantity,
                          product_slug: product?.slug,
                        }}
                      />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-8 text-center text-slate-500"
                >
                  No product variants found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-slate-500">
            {count} variant{count !== 1 ? "s" : ""} · Page {currentPage} of{" "}
            {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Link
              href={buildUrl(currentPage - 1)}
              aria-disabled={currentPage === 1}
              className={`rounded-lg border border-slate-200 p-1.5 ${currentPage === 1 ? "pointer-events-none opacity-40" : "hover:bg-slate-100"}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1
              )
              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
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
                    className={`flex h-8 min-w-[2rem] items-center justify-center rounded-lg border text-sm ${p === currentPage ? "border-blue-600 bg-blue-600 font-medium text-white" : "border-slate-200 hover:bg-slate-100"}`}
                  >
                    {p}
                  </Link>
                )
              )}
            <Link
              href={buildUrl(currentPage + 1)}
              aria-disabled={currentPage === totalPages}
              className={`rounded-lg border border-slate-200 p-1.5 ${currentPage === totalPages ? "pointer-events-none opacity-40" : "hover:bg-slate-100"}`}
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
