"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

export interface ProductSuggestion {
  id: string;
  name: string;
  slug: string;
  thumbnail: string | null;
  base_price: number;
  product_type: string;
}

interface Props {
  suggestions: ProductSuggestion[];
  selectedIndex: number;
  loading: boolean;
  visible: boolean;
  query: string;
  onSelect: (product: ProductSuggestion) => void;
  onClose?: () => void;
  className?: string;
}

export default function SearchSuggestions({
  suggestions,
  selectedIndex,
  loading,
  visible,
  query,
  onSelect,
  onClose,
  className,
}: Props) {
  if (!visible || query.length < 2) return null;

  return (
    <div className={`absolute left-0 right-0 z-[60] overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-low shadow-float ${className ?? "top-full mt-2"}`}>
      {loading ? (
        <div className="space-y-1 p-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex animate-pulse items-center gap-3 rounded-xl p-2"
            >
              <div className="h-10 w-10 shrink-0 rounded-lg bg-on-surface/10" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 rounded bg-on-surface/10" />
                <div className="h-2.5 w-1/4 rounded bg-on-surface/10" />
              </div>
            </div>
          ))}
        </div>
      ) : suggestions.length > 0 ? (
        <ul>
          {suggestions.map((product, idx) => (
            <li key={product.id}>
              <button
                type="button"
                onMouseDown={() => onSelect(product)}
                className={clsx(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                  idx === selectedIndex
                    ? "bg-primary/10"
                    : "hover:bg-surface-container"
                )}
              >
                {product.thumbnail ? (
                  <img
                    src={product.thumbnail}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container">
                    <Search size={16} className="text-on-surface-variant/40" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-on-surface">
                    {product.name}
                  </p>
                  <p className="text-xs font-medium text-on-surface-variant">
                    {product.base_price.toLocaleString()}đ
                    {/* <span className="ml-2 rounded bg-surface-container px-1.5 py-0.5 text-[10px] uppercase">
                      {product.product_type}
                    </span> */}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="p-4 text-center">
          <p className="text-sm font-medium text-on-surface-variant">
            Không tìm thấy sản phẩm &quot;{query}&quot;
          </p>
        </div>
      )}

      {/* Footer: link to full results */}
      {query.length >= 2 && (
        <Link
          href={`/search?q=${encodeURIComponent(query)}`}
          onClick={onClose}
          className="flex items-center justify-center gap-1.5 border-t border-outline-variant/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-primary transition-colors hover:bg-primary/5"
        >
          <Search size={14} />
          Xem tất cả kết quả &quot;{query}&quot;
        </Link>
      )}
    </div>
  );
}
