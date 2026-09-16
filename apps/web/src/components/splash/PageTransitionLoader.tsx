"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { classifyRouteTransition } from "./route-transition";

const DEFAULT_MIN_DURATION = 600;
const FADE_MS = 200;

/**
 * Lightweight page-transition wrapper for **nested** navigations — those that
 * keep the same first path segment, so the parent page stays mounted and only
 * its child swaps (`/shop` -> `/shop/{slug}`, `/profile` -> `/profile/orders`,
 * `/shop/a` -> `/shop/b`).
 *
 * Isolated navigations (`/shop` -> `/cart`) let the whole page swap and are
 * owned by `SplashScreen` instead. This is not a second splash: it wraps the
 * view content in a plain `div`, and while a nested redirect is in flight it
 * blurs that content and shows a DaisyUI spinner with a short
 * "Đang chuyển trang" message. It is dismissed on a fixed floor, so it never
 * waits on data and can never be pinned open by a slow query.
 *
 * **It also blocks competing actions.** A full-viewport click shield sits over
 * the chrome (sidebar, top bar, bottom nav) so a customer cannot start a second
 * navigation while the first is still landing — the exact race that leaves the
 * app showing one page while the URL says another.
 *
 * Not wrapped in a `filter: blur()` — that would make this element the
 * containing block for any `position: fixed` descendant in the page content.
 * The blur is a `backdrop-filter` overlay instead, so page layout is untouched.
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
  // overlay then covers the freshly-mounted child for its short floor.
  useEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname;

    // Cold load is not a transition — the full splash owns it.
    if (prev === null) return;
    // The arcade renders its own loading screen; never double up on it.
    if (pathname.startsWith("/gacha-mega")) return;
    // Respect reduced motion the same way SplashScreen does.
    if (
      typeof window !== "undefined" &&
      !!window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    // Only nested navigations get this overlay.
    if (classifyRouteTransition(prev, pathname) !== "nested") return;

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
        <>
          {/* Click shield. Sits above the chrome (top bar z-30, sidebar z-40,
              bottom nav z-50) but below the boot splash (z-[120]), so nothing
              in the app can be actioned mid-redirect. Invisible — the visible
              feedback is the blurred content behind it. */}
          <div aria-hidden className="fixed inset-0 z-[60] cursor-wait" />

          {/* Blur + spinner, scoped to the content this wrapper contains. */}
          <div
            role="status"
            className={`absolute inset-0 z-30 flex items-center justify-center bg-surface/70 backdrop-blur-sm transition-opacity duration-200 ${
              fading ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
          >
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-on-surface/10 bg-white/90 px-6 py-4 shadow-lg">
              <span className="loading loading-spinner loading-lg text-primary" />
              <span className="text-sm font-medium text-on-surface/80">
                Đang chuyển trang
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
