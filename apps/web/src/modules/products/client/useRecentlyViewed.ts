"use client";

import {
  STORAGE_KEY,
  mergeViewed,
  type RecentlyViewedEntry,
} from "@/lib/recently-viewed";
import { useCallback, useEffect, useState } from "react";

function readStored(): RecentlyViewedEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as RecentlyViewedEntry[]) : [];
  } catch {
    return [];
  }
}

export function useRecentlyViewed() {
  const [entries, setEntries] = useState<RecentlyViewedEntry[]>([]);

  useEffect(() => {
    setEntries(readStored());
  }, []);

  const addViewed = useCallback((next: RecentlyViewedEntry) => {
    setEntries((prev) => {
      const updated = mergeViewed(prev, next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore quota/privacy-mode errors
      }
      return updated;
    });
  }, []);

  const clearViewed = useCallback(() => {
    setEntries([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { entries, addViewed, clearViewed };
}