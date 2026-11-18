"use client";

import { useEffect, useState } from "react";
import AsyncMultiSelect, {
  AsyncSelectOption,
} from "@/components/ui/AsyncMultiSelect";
import { ShippingMethod } from "@/lib/shipping-method";
import type { VoucherScopeType } from "./types";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
};

type Props = {
  scopeType: VoucherScopeType;
  onScopeTypeChange: (value: VoucherScopeType) => void;
  productIds: string[];
  onProductIdsChange: (ids: string[]) => void;
  categorySlugs: string[];
  onCategorySlugsChange: (slugs: string[]) => void;
  excludedProductIds: string[];
  onExcludedProductIdsChange: (ids: string[]) => void;
  shippingMethodIds: string[];
  onShippingMethodIdsChange: (ids: string[]) => void;
  customerIds: string[];
  onCustomerIdsChange: (ids: string[]) => void;
};

const SCOPE_OPTIONS: { value: VoucherScopeType; label: string }[] = [
  { value: "order_total", label: "Toàn bộ đơn hàng" },
  { value: "product", label: "Sản phẩm chỉ định" },
  { value: "category", label: "Theo danh mục" },
];

const SHIPPING_METHOD_OPTIONS: { key: string; label: string }[] = [
  { key: ShippingMethod.Standard, label: "Giao tiêu chuẩn" },
  { key: ShippingMethod.Express, label: "Giao hỏa tốc" },
  { key: ShippingMethod.Shipment, label: "Đơn vị vận chuyển" },
  { key: ShippingMethod.Pickup, label: "Nhận tại cửa hàng" },
];

export default function VoucherTargetingFields({
  scopeType,
  onScopeTypeChange,
  productIds,
  onProductIdsChange,
  categorySlugs,
  onCategorySlugsChange,
  excludedProductIds,
  onExcludedProductIdsChange,
  shippingMethodIds,
  onShippingMethodIdsChange,
  customerIds,
  onCustomerIdsChange,
}: Props) {
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  useEffect(() => {
    void fetch("/api/categories")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: CategoryRow[]) =>
        setCategories(Array.isArray(data) ? data : [])
      )
      .catch(() => {});
  }, []);

  const fetchProducts = async (
    query: string
  ): Promise<AsyncSelectOption[]> => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    const res = await fetch(`/api/products/list?${params.toString()}`);
    if (!res.ok) return [];
    const data: { products?: { id: string; name: string }[] } = await res.json();
    return (data.products ?? []).map((p) => ({ key: p.id, label: p.name }));
  };

  const resolveProducts = async (
    keys: string[]
  ): Promise<AsyncSelectOption[]> => {
    if (keys.length === 0) return [];
    const res = await fetch(`/api/products/list?ids=${keys.join(",")}`);
    if (!res.ok) return [];
    const data: { products?: { id: string; name: string }[] } = await res.json();
    return (data.products ?? []).map((p) => ({ key: p.id, label: p.name }));
  };

  const resolveCategories = async (
    keys: string[]
  ): Promise<AsyncSelectOption[]> => {
    const bySlug = new Map(categories.map((c) => [c.slug, c.name]));
    return keys
      .filter((key) => bySlug.has(key))
      .map((key) => ({ key, label: bySlug.get(key)! }));
  };

  const fetchCustomers = async (
    query: string
  ): Promise<AsyncSelectOption[]> => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    const res = await fetch(`/api/users?${params.toString()}`);
    if (!res.ok) return [];
    const data: {
      id: string;
      email: string;
      first_name: string | null;
      last_name: string | null;
    }[] = await res.json();
    return (Array.isArray(data) ? data : []).map((u) => {
      const fullName = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
      return { key: u.id, label: `${fullName || ""} (${u.email})`.trim() };
    });
  };

  const resolveCustomers = async (
    keys: string[]
  ): Promise<AsyncSelectOption[]> => {
    if (keys.length === 0) return [];
    const res = await fetch(`/api/users?ids=${keys.join(",")}`);
    if (!res.ok) return [];
    const data: {
      id: string;
      email: string;
      first_name: string | null;
      last_name: string | null;
    }[] = await res.json();
    return (Array.isArray(data) ? data : []).map((u) => {
      const fullName = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
      return { key: u.id, label: `${fullName || ""} (${u.email})`.trim() };
    });
  };

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Phạm vi áp dụng (Scope)
          </label>
          <select
            value={scopeType}
            onChange={(e) =>
              onScopeTypeChange(e.target.value as VoucherScopeType)
            }
            className="h-[38px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SCOPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Voucher sản phẩm/danh mục sẽ được tự động áp dụng khi đơn hàng khớp.
          </p>
        </div>

        {scopeType === "product" && (
          <AsyncMultiSelect
            label="Sản phẩm áp dụng"
            placeholder="Nhập tên sản phẩm để tìm..."
            value={productIds}
            onChange={onProductIdsChange}
            fetchOptions={fetchProducts}
            resolveSelected={resolveProducts}
          />
        )}

        {scopeType === "category" && (
          <AsyncMultiSelect
            label="Danh mục áp dụng"
            placeholder="Nhập tên danh mục để tìm..."
            value={categorySlugs}
            onChange={onCategorySlugsChange}
            fetchOptions={(query) =>
              Promise.resolve(
                categories
                  .filter((c) =>
                    c.name.toLowerCase().includes(query.toLowerCase())
                  )
                  .filter((c) => !categorySlugs.includes(c.slug))
                  .map((c) => ({ key: c.slug, label: c.name }))
              )
            }
            resolveSelected={resolveCategories}
          />
        )}

        {(scopeType === "product" || scopeType === "category") && (
          <AsyncMultiSelect
            label="Sản phẩm loại trừ"
            placeholder="Nhập tên sản phẩm để loại trừ..."
            value={excludedProductIds}
            onChange={onExcludedProductIdsChange}
            fetchOptions={fetchProducts}
            resolveSelected={resolveProducts}
          />
        )}
      </div>

      <AsyncMultiSelect
        label="Phương thức vận chuyển áp dụng (bỏ trống = tất cả)"
        placeholder="Chọn phương thức vận chuyển..."
        value={shippingMethodIds}
        onChange={onShippingMethodIdsChange}
        fetchOptions={(query) =>
          Promise.resolve(
            SHIPPING_METHOD_OPTIONS.filter((m) =>
              m.label.toLowerCase().includes(query.toLowerCase())
            )
              .filter((m) => !shippingMethodIds.includes(m.key))
              .map((m) => ({ key: m.key, label: m.label }))
          )
        }
        resolveSelected={(keys) =>
          Promise.resolve(
            SHIPPING_METHOD_OPTIONS.filter((m) => keys.includes(m.key)).map(
              (m) => ({ key: m.key, label: m.label })
            )
          )
        }
        hint="Voucher chỉ áp dụng cho phương thức vận chuyển đã chọn."
      />

      <AsyncMultiSelect
        label="Khách hàng áp dụng (bỏ trống = tất cả)"
        placeholder="Nhập email khách hàng để tìm..."
        value={customerIds}
        onChange={onCustomerIdsChange}
        fetchOptions={fetchCustomers}
        resolveSelected={resolveCustomers}
        hint="Voucher chỉ hiển thị/áp dụng cho khách hàng đã chọn (ẩn khỏi danh sách công khai)."
      />
    </div>
  );
}