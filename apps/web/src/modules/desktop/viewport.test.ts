import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  VIEWPORT_BREAKPOINTS,
  VIEWPORT_MEDIA_QUERIES,
  classifyViewport,
  getViewportClass,
  watchViewportClass,
} from "./viewport";

describe("classifyViewport", () => {
  it("classifies below 768 as mobile", () => {
    expect(classifyViewport(0)).toBe("mobile");
    expect(classifyViewport(375)).toBe("mobile");
    expect(classifyViewport(767)).toBe("mobile");
  });

  it("classifies the 768–1023 tablet band as desktop (behavioral)", () => {
    expect(classifyViewport(768)).toBe("desktop");
    expect(classifyViewport(820)).toBe("desktop"); // iPad Air portrait
    expect(classifyViewport(1023)).toBe("desktop");
  });

  it("classifies ≥1024 as desktop", () => {
    expect(classifyViewport(1024)).toBe("desktop"); // iPad landscape seam
    expect(classifyViewport(1440)).toBe("desktop");
  });

  it("matches the Tailwind md/lg seams", () => {
    expect(VIEWPORT_BREAKPOINTS.mobile).toBe(768);
    expect(VIEWPORT_BREAKPOINTS.desktop).toBe(1024);
    expect(VIEWPORT_MEDIA_QUERIES.mobile).toBe("(max-width: 767px)");
    expect(VIEWPORT_MEDIA_QUERIES.desktop).toBe("(min-width: 1024px)");
  });
});

// ─── watchViewportClass (jsdom-ish matchMedia stub) ──────────────────────────

/**
 * Minimal matchMedia double: reads window.innerWidth live, fires "change"
 * when a boundary is crossed — the same contract the browser gives us.
 */
function installMatchMedia(initialWidth: number) {
  type Listener = (event: { matches: boolean }) => void;
  const listeners = new Map<string, Set<Listener>>();

  const matchMedia = vi.fn((query: string) => {
    const set: Set<Listener> = listeners.get(query) ?? new Set();
    listeners.set(query, set);
    return {
      get matches() {
        return evalQuery(query, (window as { innerWidth: number }).innerWidth);
      },
      media: query,
      addEventListener: (_: string, fn: Listener) => set.add(fn),
      removeEventListener: (_: string, fn: Listener) => set.delete(fn),
      onchange: null,
      addListener: undefined,
      removeListener: undefined,
      dispatchEvent: () => false,
    };
  });

  return {
    // Resize the fake window, then notify listeners whose query flipped.
    setWidth(next: number) {
      const before = (window as { innerWidth: number }).innerWidth;
      if (next === before) return;
      (window as { innerWidth: number }).innerWidth = next;
      for (const [query, set] of listeners) {
        const was = evalQuery(query, before);
        const now = evalQuery(query, next);
        if (was !== now) for (const fn of [...set]) fn({ matches: now });
      }
    },
    matchMedia,
  };
}

function evalQuery(query: string, width: number): boolean {
  const max = query.match(/max-width:\s*(\d+)px/);
  if (max) return width <= Number(max[1]);
  const min = query.match(/min-width:\s*(\d+)px/);
  if (min) return width >= Number(min[1]);
  return false;
}

describe("watchViewportClass", () => {
  const originalWindow = globalThis.window;
  let mm: ReturnType<typeof installMatchMedia>;

  beforeEach(() => {
    mm = installMatchMedia(1280);
    vi.stubGlobal("window", { innerWidth: 1280, matchMedia: mm.matchMedia });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    void originalWindow;
  });

  it("reports the initial class via get()", () => {
    const watch = watchViewportClass(() => {});
    expect(watch.get()).toBe("desktop");
    watch.stop();
  });

  it("fires onChange only when the class flips (desktop → mobile)", () => {
    const onChange = vi.fn();
    const watch = watchViewportClass(onChange);

    mm.setWidth(900); // desktop → desktop: no fire
    expect(onChange).not.toHaveBeenCalled();
    mm.setWidth(700); // crosses mobile boundary
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("mobile", "desktop");
    expect(watch.get()).toBe("mobile");

    watch.stop();
  });

  it("fires with (next, prev) crossing back up (mobile → desktop)", () => {
    const onChange = vi.fn();
    const watch = watchViewportClass(onChange);

    mm.setWidth(500);
    mm.setWidth(1200);

    expect(onChange).toHaveBeenNthCalledWith(1, "mobile", "desktop");
    expect(onChange).toHaveBeenNthCalledWith(2, "desktop", "mobile");

    watch.stop();
  });

  it("survives rapid boundary jitter without duplicate callbacks", () => {
    const onChange = vi.fn();
    const watch = watchViewportClass(onChange);

    for (const w of [769, 767, 769, 767, 769]) mm.setWidth(w);

    // Start at 1280. 1280→769 stays desktop (no fire); then each of the four
    // 769↔767 crossings flips the class — exactly once each, no storm.
    expect(onChange).toHaveBeenCalledTimes(4);
    watch.stop();
  });

  it("stop() unsubscribes — no callbacks afterwards", () => {
    const onChange = vi.fn();
    const watch = watchViewportClass(onChange);
    watch.stop();

    mm.setWidth(500);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("no-ops safely off-client (SSR)", () => {
    vi.stubGlobal("window", undefined);
    const onChange = vi.fn();
    const watch = watchViewportClass(onChange);
    expect(watch.get()).toBeNull();
    expect(() => watch.stop()).not.toThrow();
  });
});

describe("getViewportClass", () => {
  it("returns null off-client", () => {
    vi.stubGlobal("window", undefined);
    expect(getViewportClass()).toBeNull();
  });

  it("reads the live width on-client", () => {
    const stub = installMatchMedia(800);
    vi.stubGlobal("window", { innerWidth: 800, matchMedia: stub.matchMedia });
    expect(getViewportClass()).toBe("desktop"); // tablet band
  });
});
