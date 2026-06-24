"use client";

import type { ProductCardProps } from "@/components/products/ProductCard";
import ProductCard from "@/components/products/ProductCard";
import { adminQueryKeys } from "@/lib/react-query/root";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  page: number
): Promise<{ products: ProductRow[]; count: number; totalPages: number }> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (productType) params.set("productType", productType);
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
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  const { data } = useQuery({
    queryKey: adminQueryKeys.products.list(q, productType, page),
    queryFn: () => fetchProducts(q, productType, page),
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

  const buildUrl = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (productType) params.set("product_type", productType);
    params.set("page", String(p));
    return `/products?${params.toString()}`;
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-2">
        {products.length > 0
          ? products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          : (
              <div className="rounded-lg bg-white px-6 py-12 text-center text-slate-500 shadow col-span-full">
                No products found
              </div>
            )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-slate-500">
            {count} product{count !== 1 ? "s" : ""} · Page {page} of{" "}
            {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Link
              href={buildUrl(page - 1)}
              aria-disabled={page === 1}
              className={`rounded-lg border border-slate-200 p-1.5 ${
                page === 1
                  ? "pointer-events-none opacity-40"
                  : "hover:bg-slate-100"
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 || p === totalPages || Math.abs(p - page) <= 1
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
                      p === page
                        ? "border-blue-600 bg-blue-600 font-medium text-white"
                        : "border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {p}
                  </Link>
                )
              )}
            <Link
              href={buildUrl(page + 1)}
              aria-disabled={page === totalPages}
              className={`rounded-lg border border-slate-200 p-1.5 ${
                page === totalPages
                  ? "pointer-events-none opacity-40"
                  : "hover:bg-slate-100"
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
