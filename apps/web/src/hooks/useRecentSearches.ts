"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "noobstore-recent-searches";
const MAX_ITEMS = 5;

export function useRecentSearches() {
  const [searches, setSearches] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSearches(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const addSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearches((prev) => {
      const next = [trimmed, ...prev.filter((s) => s !== trimmed)].slice(
        0,
        MAX_ITEMS,
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearSearches = useCallback(() => {
    setSearches([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { searches, addSearch, clearSearches };
}
