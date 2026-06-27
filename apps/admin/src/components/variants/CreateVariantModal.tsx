"use client";

import { SingleImageUploader } from "@/components/ui/ImageUploader";
import { Plus, Trash2, X } from "lucide-react";
import NumberInput from "@/components/ui/NumberInput";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const PRE_ORDER_KEYS = ["estimate", "notes", "available_date"];

function mergePreOrderAttrs(
  attrs: { key: string; value: string }[],
  isPreOrder: boolean
) {
  if (isPreOrder) {
    const existingKeys = new Set(attrs.map((a) => a.key));
    const toAdd = PRE_ORDER_KEYS.filter((k) => !existingKeys.has(k));
    if (toAdd.length === 0) return attrs;
    return [...attrs, ...toAdd.map((k) => ({ key: k, value: "" }))];
  }
  return attrs.filter((a) => !PRE_ORDER_KEYS.includes(a.key));
}

interface Product {
  id: string;
  name: string;
  product_type: string;
  base_price: number;
  stock_quantity: number | null;
  thumbnail: string | null;
  brand: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  products: Product[];
}

export default function CreateVariantModal({ open, onClose, products }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPreOrder, setIsPreOrder] = useState(false);
  const [thumbnail, setThumbnail] = useState("");
  const [attrs, setAttrs] = useState<{ key: string; value: string }[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectedProduct =
    products.find((p) => p.id === selectedProductId) ?? null;
  const filteredProducts = productSearch.trim()
    ? products.filter((p) =>
        p.name.toLowerCase().includes(productSearch.toLowerCase())
      )
    : products;

  function handleTogglePreOrder() {
    const next = !isPreOrder;
    setAttrs((prev) => mergePreOrderAttrs(prev, next));
    setIsPreOrder(next);
  }

  if (!open) return null;

  function addAttr() {
    setAttrs((prev) => [...prev, { key: "", value: "" }]);
  }

  function removeAttr(i: number) {
    setAttrs((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateAttr(i: number, field: "key" | "value", val: string) {
    setAttrs((prev) =>
      prev.map((a, idx) => (idx === i ? { ...a, [field]: val } : a))
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const product_id = selectedProductId;
    if (!product_id) {
      setError("Please select a product.");
      setLoading(false);
      return;
    }
    const variant_name = fd.get("variant_name") as string;
    const price_adjustment = fd.get("price_adjustment")
      ? Number(fd.get("price_adjustment"))
      : null;
    const stock_quantity = fd.get("stock_quantity")
      ? Number(fd.get("stock_quantity"))
      : null;
    const product_name =
      products.find((p) => p.id === product_id)?.name ?? null;

    // Build attributes object from pairs (skip empty keys)
    const attributes =
      attrs.length > 0
        ? Object.fromEntries(
            attrs
              .filter((a) => a.key.trim())
              .map((a) => [a.key.trim(), a.value.trim()])
          )
        : null;

    const res = await fetch("/api/variants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id,
        variant_name,
        price_adjustment,
        stock_quantity,
        is_pre_order: isPreOrder,
        thumbnail: thumbnail.trim() || null,
        product_name,
        attributes,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create variant");
      return;
    }

    formRef.current?.reset();
    setAttrs([]);
    setIsPreOrder(false);
    setThumbnail("");
    setSelectedProductId(null);
    setProductSearch("");
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Create New Variant
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 transition-colors hover:bg-slate-100"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Product searchable select */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Product <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={selectedProduct ? selectedProduct.name : productSearch}
                  onFocus={() => {
                    setDropdownOpen(true);
                    if (selectedProduct) setProductSearch("");
                  }}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setSelectedProductId(null);
                    setDropdownOpen(true);
                  }}
                  onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
                  placeholder="Search product…"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {dropdownOpen && filteredProducts.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                    {filteredProducts.map((p) => (
                      <li
                        key={p.id}
                        onMouseDown={() => {
                          setSelectedProductId(p.id);
                          setProductSearch("");
                          setDropdownOpen(false);
                        }}
                        className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-blue-50"
                      >
                        {p.thumbnail ? (
                          <img
                            src={p.thumbnail}
                            alt={p.name}
                            className="h-8 w-8 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 shrink-0 rounded bg-slate-100" />
                        )}
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900">
                            {p.name}
                          </div>
                          <div className="text-xs text-slate-400">
                            {p.product_type}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Selected product info card */}
              {selectedProduct && (
                <div className="mt-2 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  {selectedProduct.thumbnail ? (
                    <img
                      src={selectedProduct.thumbnail}
                      alt={selectedProduct.name}
                      className="h-10 w-10 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 shrink-0 rounded bg-slate-200" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {selectedProduct.name}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                        {selectedProduct.product_type}
                      </span>
                      {selectedProduct.brand && (
                        <span className="text-xs text-slate-500">
                          {selectedProduct.brand}
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        {selectedProduct.base_price.toLocaleString("vi-VN")}₫
                        base
                      </span>
                      <span className="text-xs text-slate-500">
                        Stock: {selectedProduct.stock_quantity ?? "—"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedProductId(null)}
                    className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Variant Name */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Variant Name <span className="text-red-500">*</span>
              </label>
              <input
                name="variant_name"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Red / Large"
              />
            </div>

            {/* Price Adjustment + Stock */}
            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                name="price_adjustment"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
                label="Price Adjustment (₫)"
              />
              <NumberInput
                name="stock_quantity"
                min={0}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
                label="Stock Quantity (leave empty for unlimited)"
              />
            </div>

            {/* Pre-order toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTogglePreOrder}
                className={`relative h-6 w-10 rounded-full transition-colors ${isPreOrder ? "bg-purple-600" : "bg-slate-300"}`}
              >
                <span
                  className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${isPreOrder ? "translate-x-4" : ""}`}
                />
              </button>
              <span className="text-sm text-slate-700">Pre-order</span>
            </div>

            {/* Thumbnail */}
            <SingleImageUploader
              label="Thumbnail"
              value={thumbnail}
              onChange={setThumbnail}
            />

            {/* Attributes */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">
                  Attributes
                </label>
                <button
                  type="button"
                  onClick={addAttr}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add attribute
                </button>
              </div>
              {attrs.length === 0 ? (
                <p className="text-xs text-slate-400">
                  No attributes — click "Add attribute" to define key/value
                  pairs (e.g. color: red).
                </p>
              ) : (
                <div className="space-y-2">
                  {attrs.map((a, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={a.key}
                        onChange={(e) => updateAttr(i, "key", e.target.value)}
                        placeholder="Key"
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        value={a.value}
                        onChange={(e) => updateAttr(i, "value", e.target.value)}
                        placeholder="Value"
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeAttr(i)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Hidden product_id for form submission */}
            <input
              type="hidden"
              name="product_id"
              value={selectedProductId ?? ""}
            />
          </div>

          {/* Actions */}
          <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create Variant"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
