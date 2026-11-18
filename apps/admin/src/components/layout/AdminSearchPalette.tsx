"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const PAGES = [
  { label: "Dashboard", href: "/dashboard", group: "Pages" },
  { label: "Checkout Error Codes", href: "/checkout-error-codes", group: "Pages" },
  { label: "Products", href: "/products", group: "Pages" },
  { label: "Orders", href: "/orders", group: "Pages" },
  { label: "Quick Order", href: "/orders/quick", group: "Pages" },
  { label: "Users", href: "/users", group: "Pages" },
  { label: "Categories", href: "/categories", group: "Pages" },
  { label: "Inventory", href: "/inventory", group: "Pages" },
  { label: "Carts", href: "/carts", group: "Pages" },
  { label: "Stock Alerts", href: "/stock-alerts", group: "Pages" },
  { label: "Vouchers", href: "/vouchers", group: "Pages" },
  { label: "Blog", href: "/blog", group: "Pages" },
  { label: "Gacha", href: "/gacha", group: "Pages" },
  { label: "Crawling", href: "/crawling", group: "Pages" },
  { label: "Support", href: "/support", group: "Pages" },
  { label: "Reviews", href: "/reviews", group: "Pages" },
  { label: "Services", href: "/services", group: "Pages" },
  { label: "Diagrams", href: "/diagrams", group: "Tools" },
];

export default function AdminSearchPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const results = open
    ? PAGES.filter(
        (p) =>
          !query ||
          p.label.toLowerCase().includes(query.toLowerCase()) ||
          p.href.includes(query),
      )
    : [];

  const handleSelect = (url: string) => {
    onClose();
    router.push(url);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/40 pt-[15vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-[rgb(var(--admin-border))] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[rgb(var(--admin-border))] px-4 py-3">
          <Search className="h-4 w-4 text-[rgb(var(--admin-text-muted))]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter" && results.length > 0) {
                handleSelect(results[0].href);
              }
            }}
            placeholder="Search pages..."
            className="flex-1 text-sm text-[rgb(var(--admin-text))] outline-none placeholder:text-[rgb(var(--admin-text-muted))]"
          />
          <kbd className="rounded border border-[rgb(var(--admin-border))] bg-[rgb(var(--admin-hover))] px-1.5 py-0.5 text-[10px] text-[rgb(var(--admin-text-muted))]">
            ESC
          </kbd>
        </div>

        {results.length > 0 && (
          <div className="max-h-72 overflow-y-auto p-2">
            {results.map((r) => (
              <button
                key={r.href}
                onClick={() => handleSelect(r.href)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-[rgb(var(--admin-text-secondary))] transition-colors hover:bg-[rgb(var(--admin-hover))]"
              >
                <span className="w-14 text-xs font-medium text-[rgb(var(--admin-text-muted))]">
                  {r.group}
                </span>
                <span className="text-[rgb(var(--admin-text))]">{r.label}</span>
              </button>
            ))}
          </div>
        )}

        {query && results.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-[rgb(var(--admin-text-muted))]">
            No results for &quot;{query}&quot;
          </div>
        )}
      </div>
    </div>
  );
}
