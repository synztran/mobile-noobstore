"use client";

import { Clock, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { formatVND } from "@/lib/currency";

import type { ProductSuggestion } from "@/modules/products/types";
export type { ProductSuggestion };

interface Props {
  suggestions: ProductSuggestion[];
  selectedIndex: number;
  loading: boolean;
  visible: boolean;
  query: string;
  recentSearches?: string[];
  onSelect: (product: ProductSuggestion) => void;
  onSearch?: (query: string) => void;
  onClearRecent?: () => void;
  onClose?: () => void;
  className?: string;
}

export default function SearchSuggestions({
  suggestions,
  selectedIndex,
  loading,
  visible,
  query,
  recentSearches = [],
  onSelect,
  onSearch,
  onClearRecent,
  onClose,
  className,
}: Props) {
  const showRecent = visible && query.length < 2 && recentSearches.length > 0;

  if (!visible || (query.length < 2 && recentSearches.length === 0))
    return null;

  if (showRecent) {
    return (
      <div
        className={`pointer-events-auto absolute left-0 right-0 z-[100] overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-low shadow-float ${className ?? "top-full mt-2"}`}
      >
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Tìm gần đây
          </span>
          <button
            type="button"
            onClick={onClearRecent}
            className="flex items-center gap-1 text-[10px] text-on-surface-variant/60 transition-colors hover:text-error"
          >
            <Trash2 size={10} />
            Xoá
          </button>
        </div>
        {/* <ul>
          {recentSearches.map((term, idx) => (
            <li key={`${term}-${idx}`}>
              <button
                type="button"
                onClick={() => onSearch?.(term)}
                className="flex w-full items-center gap-2 p-2 text-left transition-colors hover:bg-surface-container"
              >
                <Clock size={14} className="shrink-0 text-outline-variant" />
                <span className="text-sm text-on-surface">{term}</span>
              </button>
            </li>
          ))}
        </ul> */}
      </div>
    );
  }

  if (query.length < 2) return null;

  return (
    <div
      className={`pointer-events-auto absolute left-0 right-0 z-[100] w-full overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low shadow-float ${className ?? "top-full mt-2"}`}
    >
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
            <li key={product.id} onClick={() => onSelect(product)}>
              <button
                type="button"
                className={clsx(
                  "flex w-full items-center gap-2 p-2 text-left transition-colors",
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
                  <p className="text-xs font-medium text-primary">
                    {product.min_price && !product.base_price ? (
                      <> giá từ {formatVND(product.min_price)}</>
                    ) : (
                      formatVND(product.base_price)
                    )}
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
