"use client";

import SearchSuggestions from "@/components/ui/SearchSuggestions";
import { useSearchFloating } from "@/modules/products/client/useSearchFloating";
import { AnimatePresence, motion } from "motion/react";
import { Search, X } from "lucide-react";

export function SearchFloating() {
  const {
    hidden,
    open,
    query,
    suggestions,
    suggestionsLoading,
    showSuggestions,
    recentSearches,
    selectedIndex,
    inputRef,
    containerRef,
    handleInputChange,
    handleKeyDown,
    handleSubmit,
    navigateToProduct,
    handleRecentSearch,
    handleClearRecent,
    handleOpen,
    handleClose,
    setShowSuggestions,
    isPDP,
  } = useSearchFloating();

  if (hidden) return null;

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none fixed ${isPDP ? "bottom-[13dvh]" : "bottom-[12.5dvh]"} left-4 right-4 z-[55] flex items-center gap-2 ${open ? "" : ""}`}
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
                  placeholder="Ít nhất 2 kỹ tự để tìm kiếm..."
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

      <button
        type="button"
        onClick={open ? handleClose : handleOpen}
        aria-label={open ? "Close search" : "Search"}
        className="pointer-events-auto ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-gradient text-white shadow-ambient-lg transition-transform active:scale-90"
      >
        {open ? <X size={18} /> : <Search size={18} />}
      </button>

      <SearchSuggestions
        suggestions={suggestions}
        selectedIndex={selectedIndex}
        loading={suggestionsLoading}
        visible={showSuggestions}
        query={query}
        recentSearches={recentSearches}
        onSelect={navigateToProduct}
        onSearch={handleRecentSearch}
        onClearRecent={handleClearRecent}
        onClose={() => setShowSuggestions(false)}
        className="absolute bottom-full mb-1"
      />
    </div>
  );
}
