"use client";

import CopyToClipboardButton from "@/components/products/CopyToClipboardButton";
import EditProductModal from "@/components/products/EditProductModal";
import ComponentRulesEditor from "@/components/products/ComponentRulesEditor";
import Tag from "@/components/ui/Tag";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

type VariantRow = {
  id: string;
  variant_name: string;
  price_adjustment: number | null;
  stock_quantity: number | null;
  is_pre_order: boolean | null;
  pre_order_config: unknown;
};

type ComponentRow = {
  id: string;
  component_group: string;
  is_required: boolean | null;
  max_quantity: number | null;
  component_product: {
    id: string;
    name: string;
    thumbnail: string | null;
    product_variants?: VariantRow[] | null;
  } | null;
};

type CategoryRelation = { id: string; name: string } | null;

export type ProductCardProps = {
  product: {
    id: string;
    name: string;
    slug: string;
    base_price: number;
    stock_quantity: number | null;
    product_type: string;
    brand: string | null;
    description?: string | null;
    attributes?: Record<string, string> | null;
    is_active: boolean | null;
    is_used: boolean | null;
    thumbnail: string | null;
    parent_product_id?: string | null;
    category_id?: string | null;
    categories?: CategoryRelation;
    product_variants?: VariantRow[] | null;
    product_components?: ComponentRow[] | null;
  };
};

type DisplayVariant = VariantRow & {
  display_name: string;
};

export default function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Delete product "${product.name}"? This cannot be undone.`
      )
    )
      return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      router.refresh();
    } catch {
      alert("Failed to delete product");
      setDeleting(false);
    }
  };

  const directVariants = product.product_variants ?? [];
  const components = product.product_components ?? [];

  const componentVariants: DisplayVariant[] = components.flatMap(
    (component) => {
      const componentName = component.component_product?.name ?? "Component";
      const variants = component.component_product?.product_variants ?? [];
      return variants.map((variant) => ({
        ...variant,
        display_name: `${componentName}: ${variant.variant_name}`,
      }));
    }
  );

  const effectiveVariants: DisplayVariant[] =
    product.product_type === "kit"
      ? componentVariants
      : directVariants.map((variant) => ({
          ...variant,
          display_name: variant.variant_name,
        }));

  const hasPreOrderVariant = effectiveVariants.some(
    (variant) => variant.is_pre_order
  );

  const componentGroups = components.reduce<Record<string, ComponentRow[]>>(
    (acc, component) => {
      const group = component.component_group;
      if (!acc[group]) acc[group] = [];
      acc[group].push(component);
      return acc;
    },
    {}
  );
  const categoryName = product.categories?.name || "";

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow">
      <div className="flex flex-col items-start gap-4 border-b border-slate-200 bg-slate-50 p-4">
        <div className="flex w-full items-start gap-4">
          {product.thumbnail && (
            <div className="relative h-32 min-w-32">
              <Image
                src={product.thumbnail}
                alt={product.name}
                className="rounded-xl object-cover"
                fill
              />
            </div>
          )}
          <div className="w-full space-y-1.5">
            <div className="clear-both space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-900">{product.name}</p>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    aria-label={`Delete ${product.name}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Xóa
                  </button>
                  <EditProductModal product={product} />
                </div>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Tag tone="blue">{product.product_type}</Tag>
                <Tag tone={product.is_used ? "yellow" : "green"}>
                  {product.is_used ? "Used" : "New"}
                </Tag>
                {product.is_active === false && <Tag tone="red">Inactive</Tag>}
                {hasPreOrderVariant && <Tag tone="purple">Pre-order</Tag>}
              </div>
              <div>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs">
                  <div className="flex items-baseline gap-1">
                    <dt className="shrink-0 text-slate-400">ID</dt>
                    <dd className="flex select-all items-center gap-1 truncate font-mono text-slate-400">
                      <span className="truncate">{product.id}</span>
                      <CopyToClipboardButton
                        value={product.id}
                        label={`Copy product ID ${product.id}`}
                      />
                    </dd>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <dt className="shrink-0 text-slate-400">Slug</dt>
                    <dd className="truncate font-mono text-slate-500">
                      /{product.slug}
                    </dd>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <dt className="shrink-0 text-slate-400">Price</dt>
                    <dd className="font-semibold text-slate-800">
                      {product.base_price.toLocaleString("vi-VN")}₫
                    </dd>
                  </div>
                  {product.brand && (
                    <div className="flex items-baseline gap-1">
                      <dt className="shrink-0 text-slate-400">Brand</dt>
                      <dd className="truncate text-slate-600">
                        {product.brand}
                      </dd>
                    </div>
                  )}
                  {categoryName && (
                    <div className="flex items-baseline gap-1">
                      <dt className="shrink-0 text-slate-400">Category</dt>
                      <dd className="truncate text-slate-600">
                        {categoryName}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {effectiveVariants.length > 0 && (
        <div className="border-b border-slate-100 p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Variants ({effectiveVariants.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {effectiveVariants.map((variant) => (
              <div
                key={`${variant.id}-${variant.display_name}`}
                className="flex flex-col rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-700"
              >
                <span className="font-medium">{variant.display_name}</span>
                {variant.price_adjustment !== null &&
                  variant.price_adjustment !== 0 && (
                    <span
                      className={
                        variant.price_adjustment > 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {variant.price_adjustment > 0 ? "+" : ""}
                      {variant.price_adjustment.toLocaleString("vi-VN")}₫
                    </span>
                  )}
                <span className="text-slate-400">
                  {variant.stock_quantity ?? 0} in stock
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(componentGroups).length > 0 && (
        <div className="p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Components
          </div>
          <div className="grid grid-cols-3 gap-1">
            {Object.entries(componentGroups).map(([group, items]) => (
              <div key={group}>
                <div className="mb-1 flex items-center gap-2">
                  <span className="inline-block h-px w-3 bg-slate-300" />
                  <span className="text-xs font-medium text-slate-600">
                    {group}
                  </span>
                </div>
                <div className="ml-5 flex flex-wrap gap-2">
                  {items.map((component) => (
                    <div
                      key={component.id}
                      className="flex flex-col gap-1 rounded-md bg-indigo-50 p-2 text-xs text-indigo-700"
                    >
                      {component.component_product?.name ?? "Unknown"}
                      <div className="flex flex-wrap items-center gap-1">
                        <Tag tone={component.is_required ? "red" : "blue"}>
                          {component.is_required ? "Required" : "Optional"}
                        </Tag>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {product.product_type === "kit" && (
        <div className="border-t border-slate-100 p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Conditional Variant Rules
          </div>
          <ComponentRulesEditor kitProductId={product.id} />
        </div>
      )}
    </div>
  );
}
