"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ProductOption } from "./types";
import { formatVND } from "@/lib/currency";

type Props = {
  label: string;
  placeholder: string;
  products: ProductOption[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabledIds?: string[];
};

export default function SearchableProductSelect({
  label,
  placeholder,
  products,
  value,
  onChange,
  required = false,
  disabledIds = [],
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedProduct =
    products.find((product) => product.id === value) ?? null;
  const selectedLabel = selectedProduct
    ? `${selectedProduct.name} • ${selectedProduct.id}`
    : "";

  const selectedMeta = selectedProduct
    ? [selectedProduct.product_type || null, selectedProduct.brand || null]
        .filter(Boolean)
        .join(" • ")
    : "";

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const visibleProducts = products.filter(
      (product) => !disabledIds.includes(product.id) || product.id === value
    );
    if (!query) return visibleProducts;
    return visibleProducts.filter((product) =>
      `${product.name} ${product.id}`.toLowerCase().includes(query)
    );
  }, [products, search, disabledIds, value]);

  return (
    <div ref={wrapperRef} className="relative">
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={open ? search : selectedLabel}
          onFocus={() => {
            setOpen(true);
            setSearch("");
          }}
          onChange={(event) => {
            setSearch(event.target.value);
            setOpen(true);
          }}
          placeholder={placeholder}
          readOnly={!open}
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {selectedProduct && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setSearch("");
                setOpen(true);
              }}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown className="pointer-events-none h-4 w-4 text-slate-400" />
        </div>
      </div>

      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-xs text-slate-500">
            <Search className="h-3.5 w-3.5" />
            Search by name
          </div>
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(product.id);
                  setSearch("");
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 border-b border-slate-50 px-3 py-2 text-left last:border-b-0 hover:bg-blue-50"
              >
                {product.thumbnail ? (
                  <img
                    src={product.thumbnail}
                    alt={product.name}
                    className="h-8 w-8 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 shrink-0 rounded bg-slate-100" />
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-900">
                    {product.name}
                  </div>
                  <div className="truncate font-mono text-xs text-slate-500">
                    {product.id}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="px-3 py-4 text-sm text-slate-500">
              No matching products found.
            </div>
          )}
        </div>
      )}

      {!open && selectedProduct && (
        <div className="mt-2 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
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
            <div className="truncate text-sm font-semibold text-slate-900">
              {selectedProduct.name}
            </div>
            <div className="truncate font-mono text-xs text-slate-500">
              {selectedProduct.id}
            </div>
            {selectedMeta && (
              <div className="mt-0.5 truncate text-xs text-slate-600">
                {selectedMeta}
              </div>
            )}
          </div>
          <div className="shrink-0 text-right text-xs text-slate-600">
            {selectedProduct.base_price !== undefined &&
              selectedProduct.base_price !== null && (
                <div>Price: {formatVND(selectedProduct.base_price)}</div>
              )}
            {selectedProduct.stock_quantity !== undefined &&
              selectedProduct.stock_quantity !== null && (
                <div>Stock: {selectedProduct.stock_quantity}</div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
