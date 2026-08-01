"use client";

import { Plus, X } from "lucide-react";
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

type ComponentRow = {
  componentProductId: string;
  componentGroup: string;
  isRequired: boolean;
  maxQuantity: string;
};

function emptyRow(): ComponentRow {
  return {
    componentProductId: "",
    componentGroup: "",
    isRequired: false,
    maxQuantity: "",
  };
}

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
  const [rows, setRows] = useState<ComponentRow[]>([emptyRow()]);
  const [componentProductId, setComponentProductId] = useState("");
  const [componentGroup, setComponentGroup] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [maxQuantity, setMaxQuantity] = useState("");

  const title = mode === "create" ? "Create New Component" : "Update Component";
  const submitLabel =
    mode === "create" ? "Create Components" : "Update Component";

  useEffect(() => {
    if (!open) return;
    setError(null);
    setParentProductId(component?.parent_product_id ?? "");
    setRows([emptyRow()]);
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
    () => products.filter((product) => product.product_type === "kit"),
    [products]
  );

  const componentOptions = useMemo(
    () => products.filter((product) => product.product_type === "component"),
    [products]
  );

  function updateRow(index: number, patch: Partial<ComponentRow>) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index: number) {
    setRows((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : [emptyRow()]
    );
  }

  function disabledIdsFor(index: number): string[] {
    const selectedIds = rows
      .map((row) => row.componentProductId)
      .filter(Boolean);
    return [
      parentProductId,
      ...selectedIds.filter((id) => id !== rows[index]?.componentProductId),
    ].filter(Boolean);
  }

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "create") {
      const payload = rows.map((row) => ({
        parent_product_id: parentProductId || null,
        component_product_id: row.componentProductId || null,
        component_group: row.componentGroup.trim(),
        is_required: row.isRequired,
        max_quantity: row.maxQuantity.trim() ? Number(row.maxQuantity) : null,
      }));

      const incomplete = payload.some(
        (item) =>
          !item.parent_product_id ||
          !item.component_product_id ||
          !item.component_group
      );
      if (incomplete) {
        setError(
          "Please fill in parent product, component product, and component group for every row."
        );
        setLoading(false);
        return;
      }

      const res = await fetch("/api/product-components", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setLoading(false);

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to create components");
        return;
      }

      onClose();
      router.refresh();
      return;
    }

    const payload = {
      parent_product_id: parentProductId || null,
      component_product_id: componentProductId || null,
      component_group: componentGroup.trim(),
      is_required: isRequired,
      max_quantity: maxQuantity.trim() ? Number(maxQuantity) : null,
    };

    const res = await fetch(`/api/product-components/${component?.id ?? ""}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Failed to update component");
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" />
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

            {mode === "create" ? (
              <div className="grid grid-cols-1 gap-4">
                <SearchableProductSelect
                  label="Parent Product"
                  placeholder="Search parent product by name…"
                  products={parentOptions}
                  value={parentProductId}
                  onChange={setParentProductId}
                  required
                />

                {rows.map((row, index) => (
                  <div
                    key={index}
                    className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">
                        Component {index + 1}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                        aria-label={`Remove component ${index + 1}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <SearchableProductSelect
                      label="Component Product"
                      placeholder="Search component product by name…"
                      products={componentOptions}
                      value={row.componentProductId}
                      onChange={(value) =>
                        updateRow(index, { componentProductId: value })
                      }
                      disabledIds={disabledIdsFor(index)}
                      required
                    />

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Component Group <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={row.componentGroup}
                        onChange={(e) =>
                          updateRow(index, { componentGroup: e.target.value })
                        }
                        required
                        placeholder="e.g. body, plate, accessory"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <NumberInput
                      value={
                        row.maxQuantity === "" ? null : Number(row.maxQuantity)
                      }
                      onChange={(value) =>
                        updateRow(index, {
                          maxQuantity: value != null ? String(value) : "",
                        })
                      }
                      min={1}
                      placeholder="Optional"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      label="Max Quantity (empty = unlimited)"
                    />

                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={row.isRequired}
                        onChange={(e) =>
                          updateRow(index, { isRequired: e.target.checked })
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      Required component
                    </label>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addRow}
                  className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-600"
                >
                  <Plus className="h-4 w-4" />
                  Add Component
                </button>
              </div>
            ) : (
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
            )}
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
