import EditVariantModal from "@/components/variants/EditVariantModal";
import DeleteVariantButton from "@/components/variants/DeleteVariantButton";
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
      "id, name, product_type, base_price, stock_quantity, thumbnail, brand, is_active"
    )
    .eq("product_type", "component")
    .order("name", { ascending: true });

  let query = supabase
    .from("product_variants")
    .select(
      `
			id, variant_name, price_adjustment, stock_quantity, is_pre_order, attributes, thumbnail, product_id,
			products(id, name, product_type, slug, base_price, stock_quantity, thumbnail, brand, is_active)
		`,
      { count: "exact" }
    )
    .order("variant_name", { ascending: true })
    .range(from, to);

  if (q) {
    if (searchBy === "product") {
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

      <div className="grid grid-cols-3 gap-4">
        {variants && variants.length > 0 ? (
          variants.map((v) => {
            const product = v.products as {
              id: string;
              name: string;
              product_type: string;
              slug: string | null;
              base_price: number | null;
              stock_quantity: number | null;
              thumbnail: string | null;
              brand: string | null;
              is_active: boolean | null;
            } | null;
            const attrs =
              v.attributes &&
              typeof v.attributes === "object" &&
              !Array.isArray(v.attributes)
                ? (v.attributes as Record<string, string>)
                : null;

            const priceAdj = v.price_adjustment ?? 0;

            return (
              <div
                key={v.id}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow"
              >
                {/* Product header */}
                <div className="flex items-start gap-3 border-b border-slate-200 bg-slate-50 p-4">
                  {product?.thumbnail ? (
                    <img
                      src={product.thumbnail}
                      alt={product.name}
                      className="mt-0.5 h-12 w-12 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded bg-slate-200 text-xs text-slate-400">
                      img
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {product?.name ?? "Unknown Product"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                        {product?.product_type ?? "—"}
                      </span>
                      {product?.is_active === false && (
                        <span className="inline-flex items-center rounded bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-600">
                          Inactive
                        </span>
                      )}
                      {v.is_pre_order && (
                        <span className="inline-flex items-center rounded bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                          Pre-order
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Variant details */}
                <div className="space-y-3 p-4">
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {v.variant_name}
                    </p>
                    {product?.slug && (
                      <a
                        href={`/shop/${product.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-mono text-blue-500 hover:text-blue-700 hover:underline"
                      >
                        /{product.slug}
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <span className="text-slate-400">Price Adj.</span>
                      <p className="font-medium text-slate-700">
                        {priceAdj === 0 ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <span
                            className={
                              priceAdj > 0 ? "text-green-600" : "text-red-600"
                            }
                          >
                            {priceAdj > 0 ? "+" : ""}
                            {priceAdj.toLocaleString("vi-VN")}₫
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Stock</span>
                      <p
                        className={`font-medium ${
                          (v.stock_quantity ?? 0) === 0
                            ? "text-red-500"
                            : "text-slate-700"
                        }`}
                      >
                        {v.stock_quantity ?? "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Base price</span>
                      <p className="font-medium text-slate-700">
                        {product?.base_price != null
                          ? `${product.base_price.toLocaleString("vi-VN")}₫`
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Brand</span>
                      <p className="truncate font-medium text-slate-700">
                        {product?.brand || "—"}
                      </p>
                    </div>
                  </div>

                  {attrs && Object.keys(attrs).length > 0 && (
                    <div>
                      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        Attributes
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.entries(attrs).map(([k, val]) => (
                          <span
                            key={k}
                            className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                          >
                            <span className="font-medium text-slate-500">
                              {k}:
                            </span>
                            {val}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {v.thumbnail && (
                    <div>
                      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        Variant Image
                      </span>
                      <img
                        src={v.thumbnail}
                        alt={v.variant_name}
                        className="mt-1 h-16 w-16 rounded object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1 border-t border-slate-100 bg-slate-50 px-4 py-3">
                  <EditVariantModal
                    variant={{
                      id: v.id,
                      variant_name: v.variant_name,
                      price_adjustment: v.price_adjustment,
                      stock_quantity: v.stock_quantity,
                      is_pre_order: v.is_pre_order,
                      thumbnail: v.thumbnail ?? null,
                      attributes: attrs,
                      product_id: v.product_id ?? "",
                      product_name: product?.name ?? "",
                      product_type: product?.product_type,
                      product_thumbnail: product?.thumbnail,
                      product_brand: product?.brand,
                      product_base_price: product?.base_price,
                      product_stock_quantity: product?.stock_quantity,
                      product_slug: product?.slug ?? undefined,
                    }}
                  />
                  <DeleteVariantButton
                    variantId={v.id}
                    variantName={v.variant_name}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-lg bg-white px-6 py-12 text-center text-slate-500 shadow col-span-full">
            No product variants found
          </div>
        )}
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
