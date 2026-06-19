"use client";

import { SingleImageUploader } from "@/components/ui/ImageUploader";
import VariantRulesEditor from "@/components/variants/VariantRulesEditor";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import NumberInput from "@/components/ui/NumberInput";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatVND } from "@/lib/currency";

export interface EditableVariant {
  id: string;
  variant_name: string;
  price_adjustment: number | null;
  stock_quantity: number | null;
  is_pre_order: boolean;
  thumbnail: string | null;
  attributes: Record<string, string> | null;
  product_id: string;
  product_name: string;
  product_type?: string;
  product_thumbnail?: string | null;
  product_brand?: string | null;
  product_base_price?: number | null;
  product_stock_quantity?: number | null;
  product_slug?: string;
}

interface Props {
  variant: EditableVariant;
}

export default function EditVariantModal({ variant }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [variantName, setVariantName] = useState(variant.variant_name);
  const [priceAdjustment, setPriceAdjustment] = useState(
    variant.price_adjustment === null ? 0 : variant.price_adjustment
  );
  const [stockQuantity, setStockQuantity] = useState(
    variant.stock_quantity === null ? 0 : variant.stock_quantity
  );
  const [isPreOrder, setIsPreOrder] = useState(variant.is_pre_order);
  const [thumbnail, setThumbnail] = useState(variant.thumbnail ?? "");
  const [attrs, setAttrs] = useState<{ key: string; value: string }[]>(
    variant.attributes
      ? Object.entries(variant.attributes).map(([key, value]) => ({
          key,
          value,
        }))
      : []
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    setVariantName(variant.variant_name);
    setPriceAdjustment(
      variant.price_adjustment === null ? 0 : variant.price_adjustment
    );
    setStockQuantity(
      variant.stock_quantity === null ? 0 : variant.stock_quantity
    );
    setIsPreOrder(variant.is_pre_order);
    setThumbnail(variant.thumbnail ?? "");
    setAttrs(
      variant.attributes
        ? Object.entries(variant.attributes).map(([key, value]) => ({
            key,
            value,
          }))
        : []
    );
  }, [open, variant]);

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

    const attributes =
      attrs.length > 0
        ? Object.fromEntries(
            attrs
              .filter((a) => a.key.trim())
              .map((a) => [a.key.trim(), a.value.trim()])
          )
        : null;

    const res = await fetch("/api/variants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: variant.id,
        variant_name: variantName.trim(),
        price_adjustment: priceAdjustment ?? 0,
        stock_quantity: stockQuantity ?? 0,
        is_pre_order: isPreOrder,
        thumbnail: thumbnail.trim() || null,
        attributes,
      }),
    });

    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? "Failed to update variant");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100"
        title="Edit"
      >
        <Pencil className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative mx-4 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Edit Variant
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {variant.product_name}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 transition-colors hover:bg-slate-100"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 space-y-4 overflow-y-auto p-6">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {/* Product info card (read-only) */}
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  {variant.product_thumbnail ? (
                    <Image
                      src={variant.product_thumbnail}
                      alt={variant.product_name}
                      className="h-10 w-10 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 shrink-0 rounded bg-slate-200" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {variant.product_name}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      {variant.product_type && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                          {variant.product_type}
                        </span>
                      )}
                      {variant.product_brand && (
                        <span className="text-xs text-slate-500">
                          {variant.product_brand}
                        </span>
                      )}
                      {variant.product_base_price != null && (
                        <span className="text-xs text-slate-500">
                          {variant.product_base_price.toLocaleString("vi-VN")}₫
                          base
                        </span>
                      )}
                      {variant.product_stock_quantity != null && (
                        <span className="text-xs text-slate-500">
                          Stock: {variant.product_stock_quantity}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Variant Name */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Variant Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={variantName}
                    onChange={(e) => setVariantName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Red / Large"
                  />
                </div>

                {/* Price Adjustment + Stock */}
                <div className="grid grid-cols-2 gap-3">
                  <NumberInput
                    value={priceAdjustment ?? 0}
                    onChange={(v) => setPriceAdjustment(v ?? 0)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    label="Price Adjustment (₫)"
                    subLabel={formatVND(priceAdjustment ?? 0)}
                  />
                  <NumberInput
                    value={stockQuantity ?? 0}
                    onChange={(v) => setStockQuantity(v ?? 0)}
                    min={0}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    label="Stock Quantity"
                  />
                </div>

                {/* Pre-order toggle */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPreOrder((v) => !v)}
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
                  slug={variant?.product_slug}
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
                            onChange={(e) =>
                              updateAttr(i, "key", e.target.value)
                            }
                            placeholder="Key"
                            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            value={a.value}
                            onChange={(e) =>
                              updateAttr(i, "value", e.target.value)
                            }
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
                {/* Compatibility Rules */}
                <>
                  <div className="mb-3 text-sm font-semibold text-slate-700">
                    Compatibility Rules
                  </div>
                  <VariantRulesEditor
                    variantId={variant.id}
                    productId={variant.product_id}
                    selfProductId={variant.product_id}
                  />
                </>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
