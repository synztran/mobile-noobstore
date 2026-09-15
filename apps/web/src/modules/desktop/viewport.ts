import type { DeviceClass } from "./types";

/**
 * Pure viewport-level device classification — the client-side companion to
 * `device.ts` (which classifies the *user agent* once per request at the
 * edge). This module classifies the *live viewport* so the UI can react the
 * moment it changes: window resize, device rotation, or devtools device
 * emulation. Zero React/Next imports — runs in Vitest and any client bundle.
 *
 * The UA class decides **which host/shell you get** (server, per request).
 * The viewport class decides **how the UI should behave right now**
 * (client, live). They answer different questions on purpose:
 *
 * | Question                        | Decided by              |
 * |---------------------------------|-------------------------|
 * | "Am I on m. or www.?"           | UA + middleware (edge)  |
 * | "Is this window tablet-sized?"  | this module (live)      |
 *
 * NOTE: unlike the edge classifier, viewport width alone cannot distinguish a
 * phone from a small desktop window — both are narrow. Viewport classes are
 * therefore purely *behavioral width bands*, not hardware claims.
 */

/**
 * Behavioral width bands, kept in one place so UI code never hardcodes px.
 * 768 = Tailwind `md` (phone ↔ tablet seam), 1024 = `lg` (tablet ↔ desktop).
 */
export const VIEWPORT_BREAKPOINTS = {
  mobile: 768,
  desktop: 1024,
} as const;

/** Media queries matching each band (inclusive lower bound per band). */
export const VIEWPORT_MEDIA_QUERIES = {
  mobile: `(max-width: ${VIEWPORT_BREAKPOINTS.mobile - 1}px)`,
  desktop: `(min-width: ${VIEWPORT_BREAKPOINTS.desktop}px)`,
  // 768–1023: neither query matches → tablet
} as const;

/**
 * Classify a live viewport width into a behavioral band.
 * Intentionally total: every width resolves (no null paths to handle).
 */
export function classifyViewport(width: number): DeviceClass {
  if (width < VIEWPORT_BREAKPOINTS.mobile) return "mobile";
  if (width >= VIEWPORT_BREAKPOINTS.desktop) return "desktop";
  return "desktop"; // 768–1023 tablet band renders the desktop shell
}

/**
 * Read the current viewport class in a browser. Returns null off-client
 * (SSR/hydration must not guess) — callers decide their own default.
 */
export function getViewportClass(): DeviceClass | null {
  if (typeof window === "undefined" || !window.matchMedia) return null;
  return classifyViewport(window.innerWidth);
}

export interface ViewportWatch {
  /** The viewport class when the subscription started (or null off-client). */
  get: () => DeviceClass | null;
  /** Unsubscribe. Safe to call more than once. */
  stop: () => void;
}

/**
 * Subscribe to live viewport-class changes via `matchMedia`.
 *
 * One listener per boundary query (never a resize handler) — the browser
 * coalesces these, so there is zero work on ordinary resizes/scrolls and no
 * rAF/throttle bookkeeping to get wrong. `onChange` only fires when the
 * *class* actually flips, not on every pixel of resize.
 *
 * Returns the initial class immediately (`get()`), so consumers can render
 * the right thing on the first client render without a flash.
 */
export function watchViewportClass(
  onChange: (next: DeviceClass, prev: DeviceClass) => void
): ViewportWatch {
  if (typeof window === "undefined" || !window.matchMedia) {
    return { get: () => null, stop: () => {} };
  }

  // We early-returned when window/matchMedia are missing, so the initial
  // read can't be null — narrow explicitly instead of asserting.
  const initial = getViewportClass();
  if (initial === null) {
    return { get: () => null, stop: () => {} };
  }
  let current: DeviceClass = initial;

  const queries = (
    ["mobile", "desktop"] as const
  ).map((cls) => ({
    cls,
    mq: window.matchMedia(VIEWPORT_MEDIA_QUERIES[cls]),
  }));

  const handleChange = () => {
    const next = getViewportClass();
    if (next === null || next === current) return;
    const prev = current;
    current = next;
    onChange(next, prev);
  };

  for (const { mq } of queries) mq.addEventListener("change", handleChange);

  return {
    get: () => current,
    stop: () => {
      for (const { mq } of queries)
        mq.removeEventListener("change", handleChange);
    },
  };
}
