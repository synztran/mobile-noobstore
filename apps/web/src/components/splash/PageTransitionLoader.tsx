"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { classifyRouteTransition } from "./route-transition";

const DEFAULT_MIN_DURATION = 600;
const FADE_MS = 200;

/**
 * Lightweight page-transition loader for everything except the home route.
 *
 * The boot splash (`SplashScreen`) owns home only. This wrapper covers every
 * other page: cold loads on non-home pages, isolated navigations (`/shop` ->
 * `/cart`, `/` -> `/shop`), and nested ones (`/shop` -> `/shop/{slug}`,
 * `/profile` -> `/profile/orders`) alike.
 *
 * It wraps the page in a plain `div`, and while a redirect is in flight it
 * shows a single full-viewport blurred overlay with a large DaisyUI spinner
 * and a "Đang chuyển trang" message. It is dismissed on a fixed floor, so it
 * never waits on data and can never be pinned open by a slow query.
 *
 * **It also blocks competing actions.** The full-viewport overlay sits above
 * the chrome (sidebar, top bar, bottom nav) so a customer cannot start a
 * second navigation while the first is still landing — the exact race that
 * leaves the app showing one page while the URL says another.
 */
export function PageTransitionLoader({
  minDuration = DEFAULT_MIN_DURATION,
  children,
}: {
  minDuration?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const prevPathnameRef = useRef<string | null>(null);
  const [active, setActive] = useState(false);
  const [fading, setFading] = useState(false);

  // One effect per committed route. `usePathname` only updates once the new
  // route has committed, so this fires after the swap has happened; the
  // overlay then covers the freshly-mounted page for its short floor.
  useEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname;

    const transition = classifyRouteTransition(prev, pathname);

    // Routes owned by other loaders and no-op commits get no overlay: home
    // (boot splash), the arcade (its own loading screen), reduced-motion
    // sessions, and same-route query/hash changes.
    const reducedMotion =
      typeof window !== "undefined" &&
      !!window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const shouldShow =
      pathname !== "/" &&
      !pathname.startsWith("/gacha-mega") &&
      !reducedMotion &&
      transition !== "same";

    // A commit that skips must also DEACTIVATE, not just return: a previous
    // navigation may have left `active` true with its timers already cleared
    // (rapid double-nav), so a bare return would strand the overlay over the
    // boot splash on home.
    if (!shouldShow) {
      setActive(false);
      setFading(false);
      return;
    }

    // Cold loads on non-home pages and nested/isolated navigations all get
    // the lightweight overlay — no data-fetch waiting involved.
    setActive(true);
    setFading(false);

    const fadeTimer = setTimeout(() => setFading(true), minDuration);
    const endTimer = setTimeout(() => {
      setActive(false);
      setFading(false);
    }, minDuration + FADE_MS);

    // Clearing on `pathname` change means a rapid double-nav restarts the
    // floor instead of leaving a stray timer to hide the newer overlay.
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(endTimer);
    };
  }, [pathname, minDuration]);

  return (
    <div className="relative">
      {children}

      {active && (
        <div
          role="status"
          className={`fixed inset-0 z-[60] flex cursor-wait flex-col items-center justify-center gap-4 bg-surface/70 backdrop-blur-md transition-opacity duration-200 ${
            fading ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <span className="loading loading-spinner loading-lg text-primary" />
          <span className="text-xl font-semibold text-on-surface/80">
            Đang chuyển trang
          </span>
        </div>
      )}
    </div>
  );
}
