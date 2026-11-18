"use client";

import type { ProductCardProps } from "@/components/products/ProductCard";
import ProductCard from "@/components/products/ProductCard";
import EmptyState from "@/components/ui/EmptyState";
import ExportCSVButton from "@/components/ui/ExportCSVButton";
import type { ExportColumn } from "@/lib/csv";
import { adminQueryKeys } from "@/lib/react-query/root";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type ProductRow = ProductCardProps["product"];

interface Props {
  initialProducts: ProductRow[];
  initialCount: number;
  initialTotalPages: number;
}

async function fetchProducts(
  q: string,
  productType: string,
  excludeSoldOut: boolean,
  page: number
): Promise<{ products: ProductRow[]; count: number; totalPages: number }> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (productType) params.set("productType", productType);
  if (excludeSoldOut) params.set("excludeSoldOut", "true");
  if (page > 1) params.set("page", String(page));
  const res = await fetch(`/api/products/list?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export default function ProductsClient({
  initialProducts,
  initialCount,
  initialTotalPages,
}: Props) {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const productType = searchParams.get("product_type") ?? "";
  const excludeSoldOut = searchParams.get("exclude_sold_out") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  const { data } = useQuery({
    queryKey: adminQueryKeys.products.list(
      q,
      productType,
      excludeSoldOut,
      page
    ),
    queryFn: () => fetchProducts(q, productType, excludeSoldOut, page),
    initialData: {
      products: initialProducts,
      count: initialCount,
      totalPages: initialTotalPages,
    },
    staleTime: 30_000,
  });

  const products = data?.products ?? [];
  const count = data?.count ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const exportColumns: ExportColumn<ProductRow>[] = [
    { label: "ID", accessor: (p) => p.id },
    { label: "Name", accessor: (p) => p.name },
    { label: "Slug", accessor: (p) => p.slug },
    { label: "Price", accessor: (p) => p.base_price },
    { label: "Stock", accessor: (p) => p.stock_quantity },
    { label: "Type", accessor: (p) => p.product_type },
    { label: "Brand", accessor: (p) => p.brand ?? "" },
    { label: "Active", accessor: (p) => (p.is_active ? "Yes" : "No") },
    {
      label: "Category",
      accessor: (p) =>
        "categories" in p && p.categories ? p.categories.name : "",
    },
  ];

  const buildUrl = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (productType) params.set("product_type", productType);
    if (excludeSoldOut) params.set("exclude_sold_out", "true");
    params.set("page", String(p));
    return `/products?${params.toString()}`;
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-2 xl:grid-cols-2">
        {products.length > 0 ? (
          products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        ) : (
            <div className="col-span-full">
              <div className="card-panel">
                <EmptyState
                  icon={Package}
                  title="No products found"
                  message="Try adjusting your search or filters."
                />
              </div>
            </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className="text-sm text-body">
          {count} product{count !== 1 ? "s" : ""}
          {totalPages > 1 && ` · Page ${page} of ${totalPages}`}
        </span>
        <ExportCSVButton
          data={products}
          columns={exportColumns}
          filename="products"
        />
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center pt-2">
          <div className="flex items-center gap-1">
            <Link
              href={buildUrl(page - 1)}
              aria-disabled={page === 1}
              className={`rounded-lg border border-[rgb(var(--admin-border))] p-1.5 ${
                page === 1
                  ? "pointer-events-none opacity-40"
                  : "hover:bg-[rgb(var(--admin-hover))]"
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
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
                    className="px-2 text-sm text-[rgb(var(--admin-text-muted))]"
                  >
                    …
                  </span>
                ) : (
                  <Link
                    key={p}
                    href={buildUrl(p)}
                    className={`flex h-8 min-w-[2rem] items-center justify-center rounded-lg border text-sm ${
                      p === page
                        ? "border-blue-600 bg-blue-600 font-medium text-white"
                        : "border-[rgb(var(--admin-border))] hover:bg-[rgb(var(--admin-hover))]"
                    }`}
                  >
                    {p}
                  </Link>
                )
              )}
            <Link
              href={buildUrl(page + 1)}
              aria-disabled={page === totalPages}
              className={`rounded-lg border border-[rgb(var(--admin-border))] p-1.5 ${
                page === totalPages
                  ? "pointer-events-none opacity-40"
                  : "hover:bg-[rgb(var(--admin-hover))]"
              }`}
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
