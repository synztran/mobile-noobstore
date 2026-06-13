"use client";

import ComponentRulesEditor from "@/components/products/ComponentRulesEditor";
import KitSelector, { type KitOption } from "@/components/ui/KitSelector";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import NumberInput from "@/components/ui/NumberInput";
import InputSelection from "../ui/InputSelection";

interface Props {
  open: boolean;
  onClose: () => void;
  categories:
    | {
        id: string;
        name: string;
      }[]
    | null;
}

const PRODUCT_TYPES = ["standard", "kit", "component"];

export default function CreateProductModal({
  open,
  onClose,
  categories,
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productType, setProductType] = useState("standard");
  const [slug, setSlug] = useState("");
  const [parentProductId, setParentProductId] = useState("");
  const [kitOptions, setKitOptions] = useState<KitOption[]>([]);
  const [kitOptionsLoading, setKitOptionsLoading] = useState(false);
  const [createdKitId, setCreatedKitId] = useState<string | null>(null);
  const [categoryType, setCategoryType] = useState("");

  useEffect(() => {
    if (!open) return;
    setCreatedKitId(null);
    setParentProductId("");
    setKitOptionsLoading(true);
    fetch("/api/products?productType=kit")
      .then((r) => r.json())
      .then((data) => setKitOptions(Array.isArray(data) ? data : []))
      .finally(() => setKitOptionsLoading(false));
  }, [open]);

  function toSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-");
  }

  const isKit = productType === "kit";
  if (!open) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const name = fd.get("name") as string;
    const slug = fd.get("slug") as string;
    const base_price = Number(fd.get("base_price"));
    const product_type = fd.get("product_type") as string;
    const stock_quantity =
      product_type === "kit" || !fd.get("stock_quantity")
        ? null
        : Number(fd.get("stock_quantity"));
    const brand = (fd.get("brand") as string) || null;
    const description = (fd.get("description") as string) || null;
    const parent_product_id =
      product_type === "component" ? parentProductId || null : null;

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        base_price,
        stock_quantity,
        product_type,
        brand,
        description,
        parent_product_id,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to create product");
      return;
    }

    formRef.current?.reset();
    setSlug("");
    setParentProductId("");

    if (product_type === "kit" && data.id) {
      setCreatedKitId(data.id);
    } else {
      onClose();
      router.refresh();
    }
  }

  function handleDone() {
    setCreatedKitId(null);
    router.refresh();
    onClose();
  }

  if (createdKitId) {
    return (
      <div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={handleDone} />
        <div className="relative mx-4 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Configure Variant Rules
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Optional — restrict which component variants are available for
                each kit variant.
              </p>
            </div>
            <button
              onClick={handleDone}
              className="rounded-lg p-1 transition-colors hover:bg-slate-100"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <ComponentRulesEditor kitProductId={createdKitId} />
          </div>
          <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={handleDone}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Create New Product
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
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2">
                <InputSelection
                  options={
                    categories
                      ? categories.map((c) => ({ value: c.id, label: c.name }))
                      : []
                  }
                  label="Category"
                  required
                  value={categoryType}
                  onChange={(e) => setCategoryType(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <InputSelection
                  options={PRODUCT_TYPES}
                  label="Product Type"
                  required
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="name"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Product name"
                  onChange={(e) => setSlug(toSlug(e.target.value))}
                />
              </div>

              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Slug <span className="text-red-500">*</span>
                </label>
                <input
                  name="slug"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="product-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
              </div>

              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Brand
                </label>
                <input
                  name="brand"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brand name"
                />
              </div>

              <div className="col-span-1">
                <NumberInput
                  name="base_price"
                  required
                  min={0}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  label="Base Price"
                />
              </div>

              <NumberInput
                name="stock_quantity"
                min={0}
                disabled={isKit}
                placeholder={isKit ? "—" : "0"}
                label="Stock Quantity"
              />

              {productType === "component" && (
                <div className="col-span-4">
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Parent Kit <span className="text-red-500">*</span>
                  </label>
                  <KitSelector
                    value={parentProductId}
                    onChange={setParentProductId}
                    options={kitOptions}
                    loading={kitOptionsLoading}
                  />
                </div>
              )}

              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description"
                />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Creating…" : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
