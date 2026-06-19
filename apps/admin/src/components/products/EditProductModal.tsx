"use client";

import {
  MultiImageUploader,
  SingleImageUploader,
} from "@/components/ui/ImageUploader";
import KitSelector, { type KitOption } from "@/components/ui/KitSelector";
import ComponentRulesEditor from "@/components/products/ComponentRulesEditor";
import { Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import NumberInput from "@/components/ui/NumberInput";
import InputSelection from "../ui/InputSelection";
import { formatVND } from "@/lib/currency";

const PRODUCT_TYPES = ["standard", "kit", "component"];

type EditableProduct = {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  stock_quantity: number | null;
  product_type: string;
  brand: string | null;
  description?: string | null;
  thumbnail?: string | null;
  images?: string[] | null;
  parent_product_id?: string | null;
  category_id?: string | null;
};

type Props = {
  product: EditableProduct;
};

export default function EditProductModal({ product }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(product.name);
  const [slug, setSlug] = useState(product.slug);
  const [basePrice, setBasePrice] = useState(product.base_price);
  const [productType, setProductType] = useState(product.product_type);
  const [stockQuantity, setStockQuantity] = useState(
    product.stock_quantity === null ? "" : String(product.stock_quantity)
  );
  const [brand, setBrand] = useState(product.brand ?? "");
  const [description, setDescription] = useState(product.description ?? "");
  const [thumbnail, setThumbnail] = useState(product.thumbnail ?? "");
  const [images, setImages] = useState<string[]>(
    Array.isArray(product.images) ? product.images : []
  );
  const [parentProductId, setParentProductId] = useState(
    product.parent_product_id ?? ""
  );
  const [kitOptions, setKitOptions] = useState<KitOption[]>([]);
  const [kitOptionsLoading, setKitOptionsLoading] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    []
  );
  const [categoryType, setCategoryType] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    setName(product.name);
    setSlug(product.slug);
    setBasePrice(product.base_price);
    setProductType(product.product_type);
    setStockQuantity(
      product.stock_quantity === null ? "" : String(product.stock_quantity)
    );
    setBrand(product.brand ?? "");
    setDescription(product.description ?? "");
    setThumbnail(product.thumbnail ?? "");
    setImages(Array.isArray(product.images) ? product.images : []);
    setParentProductId(product.parent_product_id ?? "");
    // Fetch kit options whenever the modal opens
    setKitOptionsLoading(true);
    fetch("/api/products?productType=kit")
      .then((r) => r.json())
      .then((data) => setKitOptions(Array.isArray(data) ? data : []))
      .finally(() => setKitOptionsLoading(false));

    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error fetching categories:", err));
  }, [open, product]);

  function toSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-");
  }

  const isKit = productType === "kit";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      name: name.trim(),
      slug: slug.trim(),
      base_price: Number(basePrice),
      product_type: productType,
      stock_quantity:
        productType === "kit" || !stockQuantity.trim()
          ? null
          : Number(stockQuantity),
      brand: brand.trim() || null,
      description: description.trim() || null,
      thumbnail: thumbnail.trim() || null,
      images: images.length > 0 ? images : null,
      parent_product_id:
        productType === "component" && parentProductId ? parentProductId : null,
      category_id: categoryType || null,
    };

    const res = await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? "Failed to update product");
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
        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative mx-4 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Edit Product
              </h2>
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
                  <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-1">
                    <InputSelection
                      label="Category"
                      options={categories.map((c) => ({
                        value: c.id,
                        label: c.name,
                      }))}
                      value={product.category_id as string}
                      onChange={(e) => {
                        setCategoryType(e.target.value);
                      }}
                      disabled={categoryType !== "kit"}
                    />
                  </div>
                  <div className="col-span-1">
                    <InputSelection
                      label="Product Type"
                      options={PRODUCT_TYPES.map((type) => ({
                        value: type,
                        label: type,
                      }))}
                      value={productType}
                      disabled={product.product_type === "kit"}
                      onChange={(e) => setProductType(e.target.value)}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setSlug(toSlug(e.target.value));
                      }}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Product name"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Slug <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="product-slug"
                    />
                  </div>

                  <NumberInput
                    value={basePrice}
                    onChange={(v) => setBasePrice(v != null ? v : 0)}
                    required
                    min={0}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    label="Base Price"
                    subLabel={formatVND(basePrice || 0)}
                  />

                  <NumberInput
                    value={stockQuantity === "" ? null : Number(stockQuantity)}
                    onChange={(v) =>
                      setStockQuantity(v != null ? String(v) : "")
                    }
                    min={0}
                    disabled={isKit}
                    placeholder={isKit ? "—" : "0"}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    label="Stock Quantity"
                  />

                  <div className="col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Brand
                    </label>
                    <input
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Brand name"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Description
                    </label>
                    <textarea
                      rows={5}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional description"
                    />
                  </div>

                  {productType === "component" && (
                    <div className="col-span-2">
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
                    <SingleImageUploader
                      value={thumbnail}
                      onChange={setThumbnail}
                      slug={slug}
                    />
                  </div>

                  <div className="col-span-2">
                    <MultiImageUploader
                      value={images}
                      onChange={setImages}
                      slug={slug}
                    />
                  </div>
                </div>

                {/* Conditional variant rules — only for kit products */}
                {productType === "kit" && (
                  <div className="border-t border-slate-200 pt-4">
                    <p className="mb-3 text-sm font-semibold text-slate-700">
                      Conditional Variant Rules
                    </p>
                    <p className="mb-3 text-xs text-slate-500">
                      Define rules that restrict which component variants are
                      available based on the kit variant selected by the
                      customer.
                    </p>
                    <ComponentRulesEditor kitProductId={product.id} />
                  </div>
                )}
              </div>
              <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
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
