"use client";

import SearchSuggestions from "@/components/ui/SearchSuggestions";
import type { ProductSuggestion } from "@/components/ui/SearchSuggestions";
import { AnimatePresence, motion } from "motion/react";
import { Search, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const SEARCH_HIDDEN_PATHS = ["/checkout", "/services", "/gacha", "/profile"];

export function SearchFloating() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const router = useRouter();
  const pathname = usePathname();

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

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setSuggestionsLoading(true);
    setShowSuggestions(true);

    try {
      const res = await fetch(
        `/api/products/search?q=${encodeURIComponent(q)}&exclude_types=component`
      );
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.slice(0, 5));
      }
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  if (SEARCH_HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;

  const handleInputChange = (value: string) => {
    setQuery(value);
    setSelectedIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit(e);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          navigateToProduct(suggestions[selectedIndex]);
        } else {
          handleSubmit(e);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      handleClose();
    }
  };

  function navigateToProduct(product: ProductSuggestion) {
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
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    inputRef.current?.blur();
  };

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] left-4 right-4 z-[55] flex items-center gap-2 ${open ? "" : ""}`}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            key="search-panel"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="pointer-events-auto flex-1"
          >
            <div className="relative">
              <form
                onSubmit={handleSubmit}
                className="flex items-center gap-2 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-2.5 shadow-ambient-sm"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tìm kiếm..."
                  className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/40"
                />
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition-colors hover:text-on-surface"
                >
                  <X size={14} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <SearchSuggestions
        suggestions={suggestions}
        selectedIndex={selectedIndex}
        loading={suggestionsLoading}
        visible={showSuggestions}
        query={query}
        onSelect={navigateToProduct}
        onClose={() => setShowSuggestions(false)}
        className="bottom-full mb-2"
      />

      <button
        type="button"
        onClick={open ? handleClose : handleOpen}
        aria-label={open ? "Close search" : "Search"}
        className="pointer-events-auto ml-auto flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full bg-primary-gradient text-white shadow-ambient-lg transition-transform active:scale-90"
      >
        {open ? <X size={18} /> : <Search size={18} />}
      </button>
    </div>
  );
}
