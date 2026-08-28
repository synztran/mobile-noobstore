"use client";

import type { PostRow } from "@/lib/community-server";
import { usePostListQuery } from "@/lib/react-query/community/api/useCommunityQueries";
import { CommunityPostCard } from "./CommunityPostCard";
import { useEffect, useRef, useState } from "react";

const TABS = [
  { value: "", label: "Tất cả" },
  { value: "knowledge", label: "Kiến thức" },
  { value: "drama", label: "Drama" },
  { value: "build", label: "Build" },
];

function FeedSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-2xl bg-surface-container-low"
        >
          <div className="aspect-[16/9] bg-surface-container-high" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-16 rounded bg-surface-container-high" />
            <div className="h-4 w-3/4 rounded bg-surface-container-high" />
            <div className="h-3 w-full rounded bg-surface-container-high" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CommunityFeed() {
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<PostRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);

  const { data, isLoading, isFetching, isError, error } = usePostListQuery(
    type,
    page,
    12,
  );
  const currentPage = data?.page ?? page;

  useEffect(() => {
    setItems([]);
    setPage(1);
    setTotalPages(1);
  }, [type]);

  const lastPageRef = useRef(currentPage);
  useEffect(() => {
    if (!data) return;
    setTotalPages(data.totalPages);
    if (currentPage === 1) {
      setItems(data.data);
    } else if (currentPage > lastPageRef.current) {
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [
          ...prev,
          ...data.data.filter((p) => !seen.has(p.id)),
        ];
      });
    }
    lastPageRef.current = currentPage;
  }, [data, currentPage]);

  const loading = isLoading && items.length === 0;
  const busy = isFetching && items.length > 0;

  return (
    <div>
      <div className="sticky top-14 z-10 -mx-4 mb-5 flex gap-2 overflow-x-auto hide-scrollbar bg-surface px-4 py-2">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setType(tab.value)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
              type === tab.value
                ? "bg-primary-fixed text-primary"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <FeedSkeleton />
      ) : isError ? (
        <p className="rounded-2xl bg-error/10 px-4 py-3 text-sm font-semibold text-error">
          {error instanceof Error ? error.message : "Không tải được bài viết"}
        </p>
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-sm font-semibold text-on-surface-variant">
          Chưa có bài viết nào. Hãy là người đầu tiên chia sẻ!
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {items.map((post) => (
            <CommunityPostCard key={post.id} post={post} />
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
    </div>
  );
}