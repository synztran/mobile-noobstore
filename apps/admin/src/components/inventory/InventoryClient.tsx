"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, ChevronLeft, ChevronRight, Package, AlertTriangle, CheckCircle } from "lucide-react";

interface Variant {
  id: string;
  variant_name: string;
  stock_quantity: number;
  price_adjustment: number | null;
}

interface InventoryProduct {
  id: string;
  name: string;
  slug: string;
  thumbnail: string | null;
  product_type: string;
  stock_quantity: number;
  base_price: number;
  is_active: boolean;
  categories: { id: string; name: string } | null;
  product_variants: Variant[];
}

interface Props {
  products: InventoryProduct[];
  count: number;
  currentPage: number;
  totalPages: number;
  q: string;
  stock: string;
}

export default function InventoryClient({
  products,
  currentPage,
  totalPages,
  q,
  stock,
}: Props) {
  const router = useRouter();
  const [searchText, setSearchText] = useState(q);
  const [updating, setUpdating] = useState<Record<string, "saving" | "idle">>({});

  function applyFilter(key: string, value: string) {
    const params = new URLSearchParams();
    if (value && value !== "all") params.set(key, value);
    if (key === "q") {
      if (stock && stock !== "all") params.set("stock", stock);
    }
    if (key === "stock") {
      if (q) params.set("q", q);
    }
    router.push(`/inventory?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    applyFilter("q", searchText);
  }

  function goToPage(page: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (stock && stock !== "all") params.set("stock", stock);
    if (page > 1) params.set("page", String(page));
    router.push(`/inventory?${params.toString()}`);
  }

  async function updateStock(productId: string, newQty: number) {
    setUpdating((prev) => ({ ...prev, [productId]: "saving" }));
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock_quantity: Math.max(0, newQty) }),
      });
      if (!res.ok) throw new Error("Failed to update");
      router.refresh();
    } catch (err) {
      console.error("Stock update failed:", err);
    } finally {
      setUpdating((prev) => ({ ...prev, [productId]: "idle" }));
    }
  }

  function getStockBadge(qty: number) {
    if (qty === 0)
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
          <AlertTriangle size={12} />
          Hết hàng
        </span>
      );
    if (qty < 10)
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
          Sắp hết
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700">
        <CheckCircle size={12} />
        Còn hàng
      </span>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-xs">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Tìm kiếm sản phẩm..."
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </form>

        <div className="flex gap-2">
          {[
            { key: "all", label: "Tất cả" },
            { key: "out", label: "Hết hàng" },
            { key: "low", label: "Sắp hết" },
            { key: "available", label: "Còn hàng" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => applyFilter("stock", tab.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                stock === tab.key
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Sản phẩm</th>
              <th className="px-4 py-3">Loại</th>
              <th className="px-4 py-3">Danh mục</th>
              <th className="px-4 py-3">Giá</th>
              <th className="px-4 py-3">Tồn kho</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Không có sản phẩm nào
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-slate-100 transition-colors hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {product.thumbnail ? (
                        <img
                          src={product.thumbnail}
                          alt=""
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                          <Package size={16} className="text-slate-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-slate-900 line-clamp-1">
                          {product.name}
                        </p>
                        <p className="text-xs text-slate-400">{product.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 uppercase">
                      {product.product_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {product.categories?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {product.base_price.toLocaleString()}đ
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-lg font-black ${
                          product.stock_quantity === 0
                            ? "text-red-600"
                            : product.stock_quantity < 10
                              ? "text-amber-600"
                              : "text-green-600"
                        }`}
                      >
                        {product.stock_quantity}
                      </span>
                      {getStockBadge(product.stock_quantity)}
                    </div>
                    {product.product_variants.length > 0 && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-600">
                          {product.product_variants.length} biến thể
                        </summary>
                        <div className="mt-1 space-y-1">
                          {product.product_variants.map((v) => (
                            <div
                              key={v.id}
                              className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 text-xs"
                            >
                              <span className="text-slate-600">{v.variant_name}</span>
                              <span
                                className={`font-semibold ${
                                  v.stock_quantity === 0
                                    ? "text-red-600"
                                    : v.stock_quantity < 10
                                      ? "text-amber-600"
                                      : "text-green-600"
                                }`}
                              >
                                {v.stock_quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {product.is_active ? (
                      <span className="text-xs font-semibold text-green-600">Đang bán</span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">Ẩn</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateStock(product.id, product.stock_quantity - 1)}
                        disabled={updating[product.id] === "saving" || product.stock_quantity <= 0}
                        className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-30"
                      >
                        −
                      </button>
                      <button
                        onClick={() => updateStock(product.id, product.stock_quantity + 1)}
                        disabled={updating[product.id] === "saving"}
                        className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="rounded-lg bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(
              (p) =>
                p === 1 ||
                p === totalPages ||
                Math.abs(p - currentPage) <= 2
            )
            .map((p, idx, arr) => (
              <span key={p} className="flex items-center gap-1">
                {idx > 0 && arr[idx - 1] !== p - 1 && (
                  <span className="px-1 text-slate-300">...</span>
                )}
                <button
                  onClick={() => goToPage(p)}
                  className={`min-w-[32px] rounded-lg px-2 py-1 text-sm font-semibold transition-colors ${
                    p === currentPage
                      ? "bg-primary text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {p}
                </button>
              </span>
            ))}
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="rounded-lg bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
