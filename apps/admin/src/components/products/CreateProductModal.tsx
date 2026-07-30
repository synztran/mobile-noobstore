"use client";

import ComponentRulesEditor from "@/components/products/ComponentRulesEditor";
import RichTextEditor from "@/components/ui/RichTextEditor";
import AttributesEditor from "@/components/ui/AttributesEditor";
import KitSelector, { type KitOption } from "@/components/ui/KitSelector";
import { invalidateCacheByPattern } from "@/lib/redis/cache";
import { useQueryClient } from "@tanstack/react-query";
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

const PRODUCT_TYPES = ["standard", "kit", "component", "gift"];

export default function CreateProductModal({
  open,
  onClose,
  categories,
}: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
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
  const [description, setDescription] = useState("");
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [isActive, setIsActive] = useState(true);
  const [isPreOrder, setIsPreOrder] = useState(false);

  function resetForm() {
    formRef.current?.reset();
    setError(null);
    setProductType("standard");
    setSlug("");
    setParentProductId("");
    setCategoryType("");
    setDescription("");
    setAttributes({});
    setIsActive(true);
  }

  useEffect(() => {
    if (!open) return;
    resetForm();
    setCreatedKitId(null);
    setKitOptionsLoading(true);
    fetch("/api/products?productType=kit")
      .then((r) => r.json())
      .then((data) => setKitOptions(Array.isArray(data) ? data : []))
      .finally(() => setKitOptionsLoading(false));
  }, [open]);

  function toSlug(value: string) {
    const vietnameseMap: Record<string, string> = {
      à: "a",
      á: "a",
      ả: "a",
      ã: "a",
      ạ: "a",
      ă: "a",
      ắ: "a",
      ằ: "a",
      ẳ: "a",
      ẵ: "a",
      ặ: "a",
      â: "a",
      ấ: "a",
      ầ: "a",
      ẩ: "a",
      ẫ: "a",
      ậ: "a",
      đ: "d",
      è: "e",
      é: "e",
      ẻ: "e",
      ẽ: "e",
      ẹ: "e",
      ê: "e",
      ế: "e",
      ề: "e",
      ể: "e",
      ễ: "e",
      ệ: "e",
      ì: "i",
      í: "i",
      ỉ: "i",
      ĩ: "i",
      ị: "i",
      ò: "o",
      ó: "o",
      ỏ: "o",
      õ: "o",
      ọ: "o",
      ô: "o",
      ố: "o",
      ồ: "o",
      ổ: "o",
      ỗ: "o",
      ộ: "o",
      ơ: "o",
      ớ: "o",
      ờ: "o",
      ở: "o",
      ỡ: "o",
      ợ: "o",
      ù: "u",
      ú: "u",
      ủ: "u",
      ũ: "u",
      ụ: "u",
      ư: "u",
      ứ: "u",
      ừ: "u",
      ử: "u",
      ữ: "u",
      ự: "u",
      ỳ: "y",
      ý: "y",
      ỷ: "y",
      ỹ: "y",
      ỵ: "y",
    };
    return value
      .toLowerCase()
      .trim()
      .split("")
      .map((ch) => vietnameseMap[ch] ?? ch)
      .join("")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  const isKit = productType === "kit";
  if (!open) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const category_id = fd.get("category") as string;
    const name = fd.get("name") as string;
    const slug = fd.get("slug") as string;
    const base_price = Number(fd.get("base_price"));
    const product_type = fd.get("product_type") as string;
    const stock_quantity =
      product_type === "kit" || !fd.get("stock_quantity")
        ? null
        : Number(fd.get("stock_quantity"));
    const max_quantity =
      product_type === "kit" || !fd.get("max_quantity")
        ? null
        : Number(fd.get("max_quantity"));
    const brand = (fd.get("brand") as string) || null;
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
        max_quantity,
        product_type,
        brand,
        description,
        parent_product_id,
        category_id,
        attributes: Object.keys(attributes).length > 0 ? attributes : null,
        is_active: isActive,
        is_pre_order: isPreOrder,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to create product");
      return;
    }

    resetForm();

    queryClient.invalidateQueries({ queryKey: ["products"] });
    invalidateCacheByPattern("*product*");

    if (product_type === "kit" && data.id) {
      setCreatedKitId(data.id);
    } else {
      onClose();
      router.refresh();
    }
  }

  function handleDone() {
    setCreatedKitId(null);
    queryClient.invalidateQueries({ queryKey: ["products"] });
    invalidateCacheByPattern("*product*");
    router.refresh();
    onClose();
  }

  if (createdKitId) {
    return (
      <div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" />
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
      <div className="absolute inset-0 bg-black/50" />

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
                  name="product_type"
                  options={PRODUCT_TYPES}
                  label="Product Type"
                  required
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <InputSelection
                  name="category"
                  options={
                    categories
                      ? categories.map((c) => ({ value: c.id, label: c.name }))
                      : []
                  }
                  label="Category"
                  required
                  value={categoryType}
                  onChange={(e) => setCategoryType(e.target.value)}
                  disabled={productType === "component" || !categories}
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

              <div
                className={`${productType !== "standard" ? "col-span-2" : "col-span-1"}`}
              >
                <NumberInput
                  name="base_price"
                  required
                  min={0}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  label="Base Price"
                />
              </div>

              <div className={`${productType !== "standard" ? "sr-only" : ""}`}>
                <NumberInput
                  name="stock_quantity"
                  min={0}
                  disabled={isKit}
                  placeholder={isKit ? "—" : "0"}
                  label="Stock Quantity"
                />
              </div>

              <div className={`${productType !== "standard" ? "sr-only" : ""}`}>
                <NumberInput
                  name="max_quantity"
                  min={0}
                  disabled={isKit}
                  placeholder={isKit ? "—" : "Unlimited"}
                  label="Max Per Cart"
                />
              </div>

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

              <div className="col-span-4">
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  label="Description"
                  placeholder="Optional description"
                  rows={3}
                />
              </div>

              <div className="col-span-4">
                <AttributesEditor value={attributes} onChange={setAttributes} />
              </div>

              <div className="col-span-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsActive((v) => !v)}
                    className={`relative h-6 w-10 rounded-full transition-colors ${isActive ? "bg-green-500" : "bg-slate-300"}`}
                  >
                    <span
                      className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-4" : ""}`}
                    />
                  </button>
                  <span className="text-sm font-medium text-slate-700">
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {productType === "kit" ? null : (
                <div className="col-span-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPreOrder((v) => !v)}
                      className={`relative h-6 w-10 rounded-full transition-colors ${isPreOrder ? "bg-violet-500" : "bg-slate-300"}`}
                    >
                      <span
                        className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${isPreOrder ? "translate-x-4" : ""}`}
                      />
                    </button>
                    <span className="text-sm font-medium text-slate-700">
                      {isPreOrder ? "Pre-order" : "Not pre-order"}
                    </span>
                  </div>
                </div>
              )}
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
