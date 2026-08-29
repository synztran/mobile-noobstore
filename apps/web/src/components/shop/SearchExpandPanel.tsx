"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { CategoryItem } from "@/lib/products-server";
import Image from "@/components/ui/AdaptiveImage";
import { Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

const PANEL_TRANSITION = { duration: 0.22, ease: "easeOut" } as const;
const SECTION_TRANSITION = { duration: 0.2 } as const;

const RecentSearchChip = memo(function RecentSearchChip({
  term,
  onSearch,
  onRemove,
}: {
  term: string;
  onSearch: (term: string) => void;
  onRemove: (term: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-surface-container py-1 pl-3 pr-1.5">
      <button
        type="button"
        onClick={() => onSearch(term)}
        className="text-sm font-semibold text-on-surface"
      >
        {term}
      </button>
      <button
        type="button"
        onClick={() => onRemove(term)}
        aria-label={`Xoá “${term}”`}
        className="flex h-5 w-5 items-center justify-center rounded-full text-primary transition-colors hover:bg-surface-container-high hover:text-on-surface "
      >
        <X size={12} />
      </button>
    </div>
  );
});

const CategoryButton = memo(function CategoryButton({
  cat,
  index,
  onSelectCategory,
}: {
  cat: CategoryItem;
  index: number;
  onSelectCategory: (slug: string) => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelectCategory(cat.slug)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.03, duration: 0.2 }}
      className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 px-1 transition-transform active:scale-[0.95]"
    >
      <span className="relative h-10 w-10 overflow-hidden rounded-full bg-surface-container">
        {cat.thumbnail ? (
          <Image
            src={cat.thumbnail}
            alt={cat.name}
            fill
            className="object-cover"
            sizes="40px"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm font-black uppercase text-on-surface-variant">
            {cat.name.charAt(0)}
          </span>
        )}
      </span>
      <span className="w-full truncate text-center text-[10px] font-bold leading-tight text-on-surface">
        {cat.name}
      </span>
    </motion.button>
  );
});

const RecentSearchesSection = memo(function RecentSearchesSection({
  recentSearches,
  onSearch,
  onRemoveRecent,
  onClearRecent,
}: {
  recentSearches: string[];
  onSearch: (term: string) => void;
  onRemoveRecent: (term: string) => void;
  onClearRecent: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05, ...SECTION_TRANSITION }}
      className="mb-4"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          Tìm gần đây
        </span>
        <button
          type="button"
          onClick={onClearRecent}
          className="flex items-center gap-1 text-xs text-error transition-colors hover:text-error"
        >
          <Trash2 size={12} />
          Xoá tất cả
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {recentSearches.map((term) => (
          <RecentSearchChip
            key={term}
            term={term}
            onSearch={onSearch}
            onRemove={onRemoveRecent}
          />
        ))}
      </div>
    </motion.section>
  );
});

const CategorySection = memo(function CategorySection({
  categories,
  onSelectCategory,
}: {
  categories: CategoryItem[];
  onSelectCategory: (slug: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  const updateScroll = useCallback(() => {
    const el = scrollRef.current;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!el || !track || !thumb) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll > 1) {
      const thumbWidth = Math.max(14, (el.clientWidth / el.scrollWidth) * 100);
      const thumbLeft = (el.scrollLeft / maxScroll) * (100 - thumbWidth);
      thumb.style.width = `${thumbWidth}%`;
      thumb.style.left = `${thumbLeft}%`;
      track.style.display = "block";
    } else {
      track.style.display = "none";
    }
  }, []);

  useEffect(() => {
    updateScroll();
  }, [categories, updateScroll]);

  return (
    <motion.section
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.08, ...SECTION_TRANSITION }}
    >
      <span className="mb-3 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
        Danh mục
      </span>
      <div
        ref={scrollRef}
        onScroll={updateScroll}
        className="hide-scrollbar -mx-1 flex overflow-x-auto pb-1.5"
      >
        {categories.map((cat, i) => (
          <CategoryButton
            key={cat.id}
            cat={cat}
            index={i}
            onSelectCategory={onSelectCategory}
          />
        ))}
      </div>
      <div
        ref={trackRef}
        style={{ display: "none" }}
        className="mx-auto mt-1.5 h-1 w-[30%] overflow-hidden rounded-full bg-surface-container"
      >
        <div
          ref={thumbRef}
          className="h-full rounded-full bg-primary"
          style={{ width: "100%", left: "0", position: "relative" }}
        />
      </div>
    </motion.section>
  );
});

export const SearchExpandPanel = memo(function SearchExpandPanel({
  open,
  categories = [],
  recentSearches = [],
  onSearch,
  onSelectCategory,
  onRemoveRecent,
  onClearRecent,
}: {
  open: boolean;
  categories?: CategoryItem[];
  recentSearches?: string[];
  onSearch: (term: string) => void;
  onSelectCategory: (slug: string) => void;
  onRemoveRecent: (term: string) => void;
  onClearRecent: () => void;
}) {
  if (recentSearches.length === 0 && categories.length === 0) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={PANEL_TRANSITION}
          className="absolute left-0 right-0 top-full z-[100] mt-2 origin-top overflow-hidden rounded-md border border-outline-variant bg-surface-container-lowest shadow-[0_16px_40px_-12px_rgba(155,63,28,0.4),0_4px_12px_rgba(0,0,0,0.08)]"
        >
          <div className="hide-scrollbar max-h-[60vh] overflow-y-auto p-4">
            {recentSearches.length > 0 && (
              <RecentSearchesSection
                recentSearches={recentSearches}
                onSearch={onSearch}
                onRemoveRecent={onRemoveRecent}
                onClearRecent={onClearRecent}
              />
            )}

            {categories.length > 0 && (
              <CategorySection
                categories={categories}
                onSelectCategory={onSelectCategory}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
