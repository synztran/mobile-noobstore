"use client";

import { useState } from "react";
import { formatVND } from "@/lib/currency";
import SearchableProductSelect from "@/components/product-components/SearchableProductSelect";
import type { ProductOption } from "@/components/product-components/types";

export type AddonItem = {
  id: string;
  main_product_id: string;
  addon_product_id: string;
  discount_type: "percentage" | "fixed_amount";
  discount_value: number;
  is_active: boolean;
  sort_order: number;
  addon?: {
    id: string;
    name: string;
    base_price: number;
    stock_quantity: number | null;
    thumbnail: string | null;
  } | null;
};

type Props = {
  mainProductId: string;
  disabledProductIds: string[];
  onSuccess: () => void;
  onCancel: () => void;
};

export default function AddAddonForm({
  mainProductId,
  disabledProductIds,
  onSuccess,
  onCancel,
}: Props) {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed_amount">("percentage");
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lazy load products once when form mounts
  const handleLoadProducts = async () => {
    if (products.length > 0 || loadingProducts) return;
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/product-components/products");
      if (!res.ok) throw new Error("Failed to load products");
      const data = await res.json();
      setProducts(data);
    } catch {
      setError("Không thể tải danh sách sản phẩm");
    } finally {
      setLoadingProducts(false);
    }
  };

  useState(() => {
    handleLoadProducts();
  });

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const originalPrice = selectedProduct?.base_price ?? 0;
  const computedDiscount =
    discountType === "percentage"
      ? Math.round((originalPrice * discountValue) / 100)
      : discountValue;
  const finalPrice = Math.max(0, originalPrice - computedDiscount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setError("Vui lòng chọn sản phẩm mua kèm");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/products/${mainProductId}/addons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addon_product_id: selectedProductId,
          discount_type: discountType,
          discount_value: discountValue,
          sort_order: sortOrder,
          is_active: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Thêm sản phẩm mua kèm thất bại");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-indigo-950">Thêm sản phẩm mua kèm mới</h4>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-slate-500 hover:text-slate-800"
        >
          Hủy
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600">
          {error}
        </div>
      )}

      <div>
        <SearchableProductSelect
          label="Chọn sản phẩm bán kèm"
          placeholder={loadingProducts ? "Đang tải sản phẩm..." : "Tìm theo tên hoặc ID..."}
          products={products}
          value={selectedProductId}
          onChange={setSelectedProductId}
          required
          disabledIds={[mainProductId, ...disabledProductIds]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            Loại giảm giá
          </label>
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed_amount")}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
          >
            <option value="percentage">Theo phần trăm (%)</option>
            <option value="fixed_amount">Số tiền cố định (₫)</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            {discountType === "percentage" ? "Mức giảm (%)" : "Mức giảm (₫)"}
          </label>
          <input
            type="number"
            min={0}
            max={discountType === "percentage" ? 100 : undefined}
            value={discountValue}
            onChange={(e) => setDiscountValue(Number(e.target.value))}
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {selectedProduct && (
        <div className="flex items-center justify-between rounded-lg bg-white p-2.5 text-xs border border-indigo-100">
          <span className="text-slate-500">Giá sau giảm preview:</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-indigo-600">{formatVND(finalPrice)}</span>
            <span className="text-[10px] text-slate-400 line-through">{formatVND(originalPrice)}</span>
            <span className="rounded bg-rose-50 px-1 py-0.5 text-[10px] font-bold text-rose-600">
              -{formatVND(computedDiscount)}
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-600">Thứ tự hiển thị:</label>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className="w-16 rounded border border-slate-300 px-2 py-1 text-xs"
          />
        </div>

        <button
          type="submit"
          disabled={saving || !selectedProductId}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Đang lưu..." : "Xác nhận thêm"}
        </button>
      </div>
    </form>
  );
}
