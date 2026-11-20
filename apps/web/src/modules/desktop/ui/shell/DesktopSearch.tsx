"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import SearchSuggestions from "@/components/ui/SearchSuggestions";
import { useProductSearch } from "@/modules/products/client/queries";
import { useRecentSearches } from "@/modules/products/client/useRecentSearches";
import { trackSearch } from "@/lib/analytics";

/**
 * Desktop header search. Mirrors the storefront's mobile search behaviour:
 * results stream in below the field as the user types (no Enter required),
 * arrow keys move through them, and Enter falls back to the full `/search`
 * results page.
 */
export function DesktopSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const { addSearch } = useRecentSearches();
  const { data: suggestions = [], isLoading } =
    useProductSearch(debouncedQuery);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    setSelectedIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => setDebouncedQuery(value.trim()),
      250
    );
  };

  const close = useCallback(() => {
    setFocused(false);
    setQuery("");
    setDebouncedQuery("");
    setSelectedIndex(-1);
    inputRef.current?.blur();
  }, []);

  const submit = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    trackSearch(trimmed);
    addSearch(trimmed);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    close();
  }, [addSearch, close, query, router]);

  const selectProduct = useCallback(
    (product: { slug: string; name: string }) => {
      addSearch(product.name);
      router.push(`/shop/${product.slug}`);
      close();
    },
    [addSearch, close, router]
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const items = suggestions ?? [];
    const open = query.trim().length >= 2;

    if (event.key === "Escape") {
      setFocused(false);
      setSelectedIndex(-1);
      inputRef.current?.blur();
      return;
    }

    if (!open || items.length === 0) {
      if (event.key === "Enter") {
        event.preventDefault();
        submit();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const picked = selectedIndex >= 0 ? items[selectedIndex] : undefined;
      if (picked) selectProduct(picked);
      else submit();
    }
  };

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="ml-auto w-[clamp(320px,30vw,440px)] min-w-[320px] max-w-full"
    >
      <div ref={wrapperRef} className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant"
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Tìm kiếm sản phẩm"
          aria-expanded={focused && query.trim().length >= 2}
          aria-autocomplete="list"
          placeholder="Nhập ít nhất 2 ký tự để tìm kiếm..."
          value={query}
          onChange={(event) => handleChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          className="w-full rounded-full border border-on-surface/10 bg-surface-container-low py-2.5 pl-10 pr-10 text-sm text-on-surface transition-colors placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none"
        />
        {query && (
          <button
            type="button"
            aria-label="Xoá tìm kiếm"
            onClick={() => {
              setQuery("");
              setDebouncedQuery("");
              setSelectedIndex(-1);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-on-surface-variant/60 transition-colors hover:text-on-surface"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        <SearchSuggestions
          suggestions={suggestions}
          selectedIndex={selectedIndex}
          loading={isLoading}
          visible={focused}
          query={query.trim()}
          recentSearches={[]}
          onSelect={selectProduct}
          onSearch={(term) => {
            addSearch(term);
            router.push(`/search?q=${encodeURIComponent(term)}`);
            close();
          }}
          onClose={close}
          className="top-full mt-2"
        />
      </div>
    </form>
  );
}
