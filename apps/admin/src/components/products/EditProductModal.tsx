"use client";

import {
  MultiImageUploader,
  SingleImageUploader,
} from "@/components/ui/ImageUploader";
import KitSelector, { type KitOption } from "@/components/ui/KitSelector";
import ComponentRulesEditor from "@/components/products/ComponentRulesEditor";
import { invalidateCacheByPattern } from "@/lib/redis/cache";
import { Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import NumberInput from "@/components/ui/NumberInput";
import RichTextEditor from "@/components/ui/RichTextEditor";
import AttributesEditor from "@/components/ui/AttributesEditor";
import InputSelection from "../ui/InputSelection";
import { formatVND } from "@/lib/currency";

const PRODUCT_TYPES = ["standard", "kit", "component", "gift"];

type VariantRow = {
  id: string;
  is_pre_order: boolean | null;
};

type EditableProduct = {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  stock_quantity: number | null;
  product_type: string;
  brand: string | null;
  description?: string | null;
  attributes?: Record<string, string> | null;
  is_active?: boolean | null;
  thumbnail?: string | null;
  images?: string[] | null;
  parent_product_id?: string | null;
  categories?: {
    id: string;
    name: string;
  } | null;
  product_variants?: VariantRow[] | null;
  is_pre_order?: boolean;
};

type Props = {
  product: EditableProduct;
};

export default function EditProductModal({ product }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
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
  const [attributes, setAttributes] = useState<Record<string, string>>(
    product.attributes ?? {}
  );
  const [isActive, setIsActive] = useState(product.is_active ?? true);
  const [isPreOrder, setIsPreOrder] = useState(
    product.product_type === "kit"
      ? product.product_variants?.some((v) => v.is_pre_order)
      : product.is_pre_order
  );

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
    setCategoryType(product.categories?.id ?? ""); // Reset category selection when opening modal
    setAttributes(product.attributes ?? {});
    setIsActive(product.is_active ?? true);
    setIsPreOrder(
      product.product_type === "kit"
        ? (product.product_variants?.some((v) => v.is_pre_order) ?? false)
        : product.is_pre_order
    );
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
      attributes: Object.keys(attributes).length > 0 ? attributes : null,
      is_active: isActive,
      is_pre_order: isPreOrder,
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
    queryClient.invalidateQueries({ queryKey: ["products"] });
    invalidateCacheByPattern("*product*");
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
          <div className="absolute inset-0 bg-black/50" />
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
                      value={categoryType}
                      onChange={(e) => {
                        setCategoryType(e.target.value);
                      }}
                      // disabled={categoryType !== "kit"}
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
                    <RichTextEditor
                      value={description}
                      onChange={setDescription}
                      label="Description"
                      placeholder="Optional description"
                      rows={5}
                    />
                  </div>

                  <div className="col-span-2">
                    <AttributesEditor
                      value={attributes}
                      onChange={setAttributes}
                    />
                  </div>

                  <div className="col-span-2">
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

                  {productType === "component" && (
                    <div className="col-span-2">
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
                        {product.product_variants?.length ? (
                          <span className="text-xs text-slate-400">
                            Applies to all {product.product_variants.length}{" "}
                            variants
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}

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
