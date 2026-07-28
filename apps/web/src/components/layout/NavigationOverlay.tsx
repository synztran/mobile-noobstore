"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useNavigationStore } from "@/store/navigation";

const MIN_DISPLAY_MS = 400;

export function NavigationOverlay() {
  const pathname = usePathname();
  const { isNavigating, startNavigation, endNavigation } = useNavigationStore();
  const prevPathname = useRef(pathname);
  const pathnameRef = useRef(pathname);
  const startedAt = useRef(0);

  // Lock scroll when overlay is visible
  useEffect(() => {
    if (isNavigating) {
      document.documentElement.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
      window.scrollTo(0, 0);
    }
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [isNavigating]);

  // Keep pathnameRef in sync
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Auto-hide after pathname change (with min display time)
  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      const elapsed = Date.now() - startedAt.current;
      const delay = Math.max(0, MIN_DISPLAY_MS - elapsed);
      const timer = setTimeout(() => endNavigation(), delay);
      return () => clearTimeout(timer);
    }
  }, [pathname, endNavigation]);

  // Intercept Link clicks to start overlay before navigation
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey) return;
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("http") ||
        href.startsWith("//") ||
        href.startsWith("#")
      )
        return;
      // Don't show overlay for same-page navigation (pathname won't change)
      if (href === pathnameRef.current) return;
      startedAt.current = Date.now();
      startNavigation();
    };
    document.addEventListener("click", handleClick, { capture: true });
    return () =>
      document.removeEventListener("click", handleClick, { capture: true });
  }, [startNavigation]);

  if (!isNavigating) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-200 min-h-[100dvh]">
      <div className="flex flex-col items-center gap-4">
        <span className="loading loading-spinner w-[3rem] text-accent" />
        <p className="animate-pulse text-lg font-black tracking-wider text-white drop-shadow-lg">
          Đang chuyển trang...
        </p>
      </div>
    </div>
  );
}
