"use client";

import Link from "next/link";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Path to navigate to, e.g. "/users". */
  basePath: string;
  /**
   * Existing query params to carry across page changes, e.g. an active search
   * term or role filter. Empty values are dropped.
   */
  query?: Record<string, string>;
}

// Built here rather than passed in as a callback: this component is a Client
// Component (it needs onClick to block disabled pagination for keyboard users),
// so a function prop from the server page would not survive the boundary.
function buildHref(
  basePath: string,
  query: Record<string, string> | undefined,
  page: number
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) params.set(key, value);
  }
  params.set("page", String(page));
  return `${basePath}?${params.toString()}`;
}

export default function Pagination({
  page,
  totalPages,
  basePath,
  query,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const linkBase =
    "rounded-lg border border-[rgb(var(--admin-border))] bg-[rgb(var(--admin-surface))] px-3 py-1.5 text-[13px] text-[rgb(var(--admin-text-secondary))] transition-colors hover:bg-[rgb(var(--admin-hover))]";

  return (
    <div className="flex items-center justify-center gap-4">
      <Link
        href={buildHref(basePath, query, page - 1)}
        aria-disabled={page <= 1}
        onClick={(e) => page <= 1 && e.preventDefault()}
        className={`${linkBase} ${
          page <= 1
            ? "pointer-events-none opacity-50"
            : ""
        }`}
      >
        Previous
      </Link>
      <span className="text-[13px] text-body">
        Page {page} of {totalPages}
      </span>
      <Link
        href={buildHref(basePath, query, page + 1)}
        aria-disabled={page >= totalPages}
        onClick={(e) => page >= totalPages && e.preventDefault()}
        className={`${linkBase} font-medium ${
          page >= totalPages
            ? "pointer-events-none opacity-50"
            : ""
        }`}
      >
        Next
      </Link>
    </div>
  );
}
