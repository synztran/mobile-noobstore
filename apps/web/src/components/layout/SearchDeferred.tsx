"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

const SearchFloating = dynamic(
  () =>
    import("@/components/layout/SearchFloating").then((m) => ({
      default: m.SearchFloating,
    })),
  { ssr: false }
);

const SEARCH_HIDDEN_PATHS = [
  "/checkout",
  "/services",
  "/gacha",
  "/profile",
  "/community",
  "/documents",
];

export function SearchDeferred() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (ready) return <SearchFloating />;

  const hidden =
    mounted && SEARCH_HIDDEN_PATHS.some((p) => pathname.startsWith(p));
  if (hidden) return null;

  const isPDP = pathname.startsWith("/shop/") && pathname !== "/shop";
  const bottom = isPDP ? "bottom-[13dvh]" : "bottom-[12.5dvh]";

  return (
    <button
      type="button"
      onClick={() => setReady(true)}
      aria-label="Search"
      className={`fixed ${bottom} right-4 z-[55] flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-gradient text-white shadow-ambient-lg transition-transform active:scale-90`}
    >
      <Search size={18} />
    </button>
  );
}
