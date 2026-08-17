"use client";

import type { DocumentRow } from "@/lib/community-server";
import { useDocumentListQuery } from "@/lib/react-query/community/api/useCommunityQueries";
import { Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DocumentCard } from "./DocumentCard";
import { DocumentDetailDrawer } from "./DocumentDetailDrawer";

function FeedSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl bg-surface-container-low p-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-surface-container-high" />
            <div className="h-4 w-1/2 rounded bg-surface-container-high" />
          </div>
          <div className="mt-3 h-4 w-3/4 rounded bg-surface-container-high" />
          <div className="mt-2 h-3 w-full rounded bg-surface-container-high" />
        </div>
      ))}
    </div>
  );
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function DocumentFeed() {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<DocumentRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DocumentRow | null>(null);
  const lastPageRef = useRef(1);

  const debouncedQuery = useDebouncedValue(query.trim(), 350);
  const [keyboard, setKeyboard] = useState("");

  useEffect(() => {
    setItems([]);
    setPage(1);
    setTotalPages(1);
    setKeyboard(debouncedQuery);
  }, [debouncedQuery]);

  const { data, isLoading, isFetching, isError, error } = useDocumentListQuery(
    page,
    12,
    keyboard
  );
  const currentPage = data?.page ?? page;

  useEffect(() => {
    if (!data) return;
    setTotalPages(data.totalPages);
    if (currentPage === 1) {
      setItems(data.data);
    } else {
      setItems((prev) => {
        const byId = new Map(prev.map((p) => [p.id, p]));
        for (const doc of data.data) byId.set(doc.id, doc);
        return Array.from(byId.values());
      });
    }
    lastPageRef.current = Math.max(lastPageRef.current, currentPage);
  }, [data, currentPage]);

  const loading = isLoading && items.length === 0;
  const busy = isFetching && items.length > 0;
  const searching = keyboard.length > 0 && loading;

  const clearSearch = useCallback(() => setQuery(""), []);

  return (
    <div>
      <div className="mb-5">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo bàn phím, tên hoặc phiên bản..."
            className="w-full rounded-2xl border-2 border-transparent bg-surface-container px-9 py-2.5 pr-10 text-sm font-semibold text-on-surface outline-none transition-all focus:border-primary"
          />
          {query && (
            <button
              type="button"
              aria-label="Xoá tìm kiếm"
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <FeedSkeleton />
      ) : isError ? (
        <p className="rounded-2xl bg-error/10 px-4 py-3 text-sm font-semibold text-error">
          {error instanceof Error ? error.message : "Không tải được tài liệu"}
        </p>
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-sm font-semibold text-on-surface-variant">
          {keyboard
            ? `Không tìm thấy tài liệu cho "${keyboard}"`
            : "Chưa có tài liệu nào được chia sẻ. Hãy là người đầu tiên!"}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((document) => (
            <div key={document.id}>
              <DocumentCard document={document} onOpen={setSelected} />
            </div>
          ))}
        </div>
      )}

      {!loading && !isError && page < totalPages && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={busy}
            className="btn btn-primary btn-md w-full rounded-full text-xs font-bold uppercase tracking-widest text-white shadow-ambient-sm transition-transform active:scale-[0.98] disabled:opacity-70"
          >
            {busy ? "Đang tải..." : "Xem thêm"}
          </button>
        </div>
      )}

      <DocumentDetailDrawer
        document={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
