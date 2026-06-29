"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useNavigationStore } from "@/store/navigation";

const MIN_DISPLAY_MS = 400;

export function NavigationOverlay() {
  const pathname = usePathname();
  const { isNavigating, startNavigation, endNavigation } = useNavigationStore();
  const prevPathname = useRef(pathname);
  const startedAt = useRef(0);
  const scrollY = useRef(0);

  // Lock scroll when overlay is visible
  useEffect(() => {
    if (isNavigating) {
      scrollY.current = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY.current}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY.current);
    }
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
    };
  }, [isNavigating]);

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
      startedAt.current = Date.now();
      startNavigation();
    };
    document.addEventListener("click", handleClick, { capture: true });
    return () =>
      document.removeEventListener("click", handleClick, { capture: true });
  }, [startNavigation]);

  if (!isNavigating) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-200">
      <div className="flex flex-col items-center gap-4">
        <span className="loading loading-spinner w-[3rem] text-accent" />
        <p className="animate-pulse text-lg font-black tracking-wider text-white drop-shadow-lg">
          Đang chuyển trang...
        </p>
      </div>
    </div>
  );
}
