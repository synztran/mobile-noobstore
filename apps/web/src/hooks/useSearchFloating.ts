"use client";

import type { ProductSuggestion } from "@/types/search";
import { useProductSearch } from "@/lib/react-query/product/api/useProductQueries";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRecentSearches } from "./useRecentSearches";

const SEARCH_HIDDEN_PATHS = ["/checkout", "/services", "/gacha", "/profile"];

export function useSearchFloating() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const router = useRouter();
  const pathname = usePathname();

  const { searches: recentSearches, addSearch, clearSearches } = useRecentSearches();

  const [debouncedQuery, setDebouncedQuery] = useState("");
  const { data: suggestions, isLoading: suggestionsLoading } =
    useProductSearch(debouncedQuery);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open && recentSearches.length > 0 && query.length < 2) {
      setShowSuggestions(true);
    } else if (debouncedQuery.length >= 2) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [debouncedQuery, open, recentSearches.length, query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    setSelectedIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(value), 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = suggestions ?? [];
    if (!showSuggestions || items.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && items[selectedIndex]) {
          navigateToProduct(items[selectedIndex]);
        } else {
          handleSubmit();
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  };

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (trimmed) {
      addSearch(trimmed);
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      handleClose();
    }
  };

  function navigateToProduct(product: ProductSuggestion) {
    addSearch(product.name);
    router.push(`/shop/${product.slug}`);
    handleClose();
  }

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  const handleClose = () => {
    setOpen(false);
    setQuery("");
    setShowSuggestions(false);
    setSelectedIndex(-1);
    setDebouncedQuery("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    inputRef.current?.blur();
  };

  const handleRecentSearch = useCallback(
    (term: string) => {
      router.push(`/search?q=${encodeURIComponent(term)}`);
      handleClose();
    },
    [router],
  );

  return {
    hidden: mounted && SEARCH_HIDDEN_PATHS.some((p) => pathname.startsWith(p)),
    open,
    query,
    suggestions: suggestions ?? [],
    suggestionsLoading: !!suggestionsLoading,
    showSuggestions,
    recentSearches,
    selectedIndex,
    inputRef,
    containerRef,
    handleInputChange,
    handleKeyDown,
    handleSubmit: (e: React.FormEvent) => {
      e.preventDefault();
      handleSubmit();
    },
    navigateToProduct,
    handleRecentSearch,
    handleClearRecent: clearSearches,
    handleOpen,
    handleClose,
    setShowSuggestions,
  };
}
