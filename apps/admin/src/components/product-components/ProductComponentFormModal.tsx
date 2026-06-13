"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import SearchableProductSelect from "./SearchableProductSelect";
import type { ProductComponentRow, ProductOption } from "./types";
import NumberInput from "@/components/ui/NumberInput";

type Mode = "create" | "update";

type Props = {
  open: boolean;
  onClose: () => void;
  products: ProductOption[];
  mode: Mode;
  component?: ProductComponentRow | null;
};

export default function ProductComponentFormModal({
  open,
  onClose,
  products,
  mode,
  component,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parentProductId, setParentProductId] = useState("");
  const [componentProductId, setComponentProductId] = useState("");
  const [componentGroup, setComponentGroup] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [maxQuantity, setMaxQuantity] = useState("");

  const title = mode === "create" ? "Create New Component" : "Update Component";
  const submitLabel =
    mode === "create" ? "Create Component" : "Update Component";

  useEffect(() => {
    if (!open) return;
    setError(null);
    setParentProductId(component?.parent_product_id ?? "");
    setComponentProductId(component?.component_product_id ?? "");
    setComponentGroup(component?.component_group ?? "");
    setIsRequired(Boolean(component?.is_required));
    setMaxQuantity(
      component?.max_quantity === null || component?.max_quantity === undefined
        ? ""
        : String(component.max_quantity)
    );
  }, [open, component]);

  const parentOptions = useMemo(
    () =>
      products.filter(
        (product) =>
          product.product_type === "kit" && product.id !== componentProductId
      ),
    [products, componentProductId]
  );

  const componentOptions = useMemo(
    () => products.filter((product) => product.id !== parentProductId),
    [products, parentProductId]
  );

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      parent_product_id: parentProductId || null,
      component_product_id: componentProductId || null,
      component_group: componentGroup.trim(),
      is_required: isRequired,
      max_quantity: maxQuantity.trim() ? Number(maxQuantity) : null,
    };

    const url =
      mode === "create"
        ? "/api/product-components"
        : `/api/product-components/${component?.id ?? ""}`;

    const res = await fetch(url, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? `Failed to ${mode} component`);
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 transition-colors hover:bg-slate-100"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              <SearchableProductSelect
                label="Parent Product"
                placeholder="Search parent product by name…"
                products={parentOptions}
                value={parentProductId}
                onChange={setParentProductId}
                required
              />

              <SearchableProductSelect
                label="Component Product"
                placeholder="Search component product by name…"
                products={componentOptions}
                value={componentProductId}
                onChange={setComponentProductId}
                required
              />

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Component Group <span className="text-red-500">*</span>
                </label>
                <input
                  value={componentGroup}
                  onChange={(e) => setComponentGroup(e.target.value)}
                  required
                  placeholder="e.g. body, plate, accessory"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <NumberInput
                value={maxQuantity === "" ? null : Number(maxQuantity)}
                onChange={(v) => setMaxQuantity(v != null ? String(v) : "")}
                min={1}
                placeholder="Optional"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                label="Max Quantity (empty = unlimited)"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Required component
            </label>
          </div>
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
              {loading ? `${submitLabel}…` : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
