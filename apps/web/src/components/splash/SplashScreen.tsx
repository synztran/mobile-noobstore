"use client";

import { LOGO_NOOB_STORE } from "@/lib/images";
import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { classifyRouteTransition } from "./route-transition";

interface SplashScreenProps {
  /** Floor time on screen, in ms. The splash never hides before this, even
      when everything is already cached. Default 1200. */
  minDuration?: number;
  /** Only play once per browsing session (sessionStorage-gated). Default true. */
  showOncePerSession?: boolean;
  /** sessionStorage key used by the once-per-session gate. */
  sessionKey?: string;
  /** Always play on mount, bypassing the once-per-session gate. Does not
      read or stamp the session flag. */
  forceShow?: boolean;
  children?: React.ReactNode;
}

/**
 * Core `/api` data queries that gate splash completion — the page's main data
 * (cart + home rails). Chrome queries (notifications, profile, gacha…) are
 * deliberately excluded so they can't pin the splash open.
 */
const CORE_QUERY_MATCHES: Array<(key: readonly unknown[]) => boolean> = [
  // Only block the splash on data needed for the first viewport. Lower-page
  // rails and the cart hydrate in the background; waiting on them can leave
  // the boot screen parked at START_PCT on a slow API.
  (key) => key[0] === "home" && key[1] === "hero",
];

const START_PCT = 12;
const RAMP_CEIL = 90; // bar never completes on its own — snaps to 100 when done
const RAMP_INTERVAL_MS = 150;
const SETTLE_MS = 300; // sustained-idle window before hiding once data lands
const FAILSAFE_MARGIN_MS = 6000; // failsafe = minDuration + margin — never preempts the data wait

/**
 * Full-screen NoobStore boot splash — plays ONLY on the home route.
 * Ported from `mockup-ui/loading-screen/code.html` (keycap boot screen).
 *
 * Every other page (and every redirect that doesn't land on home) is owned by
 * `PageTransitionLoader`'s lightweight "Đang chuyển trang" overlay instead.
 *
 * The splash hides once the page's core `/api` data (cart + home rails) has
 * settled in the React Query cache, at least `minDuration` after mount — the
 * bar ramps deterministically to a ceiling and snaps to 100% on completion.
 * A fail-safe always trips if the page stalls. Renders `children` underneath;
 * keyframes are injected via a scoped <style> so the component is fully
 * self-contained.
 */
export function SplashScreen({
  minDuration = 1200,
  showOncePerSession = true,
  sessionKey = "noobstore.splash.seen",
  forceShow = false,
  children,
}: SplashScreenProps) {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const [skip, setSkip] = useState(false);
  // Only the home route owns the boot splash. Initializing from the route
  // (SSR-consistent via `usePathname`) means home keeps its splash in the
  // initial HTML, while non-home cold loads render no splash markup at all —
  // previously the overlay rendered on every mount because `active` started
  // false and `showOverlay` ignored it, flashing the full splash over the
  // light transition loader on non-home pages.
  const [active, setActive] = useState(() => pathname === "/"); // overlay mounted + tracking
  const [percent, setPercent] = useState<number>(START_PCT);
  const [fading, setFading] = useState(false);
  const [gone, setGone] = useState(false);
  const [done, setDone] = useState(false);
  const [bootSettled, setBootSettled] = useState(false);

  const startedAtRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  const prevPathnameRef = useRef<string | null>(null);

  // 1) Decided in an effect (never during render) so SSR-safe and immune to
  //    private-mode sessionStorage throwing during hydration. Reduced motion
  //    → skip the splash entirely, even with forceShow. The Mega Gacha arcade
  //    (/gacha-mega) also opts out: it renders its own loading screen
  //    (MegaGachaLoadingScreen), so the store splash would double up — most
  //    visibly when its close button navigates back and the splash replays.
  useEffect(() => {
    let mounted = true;
    const shouldSkip =
      pathname.startsWith("/gacha-mega") ||
      pathname !== "/" ||
      (showOncePerSession && !forceShow && sessionSeen(sessionKey)) ||
      (typeof window !== "undefined" &&
        !!window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (!mounted) return;
    setSkip(shouldSkip);
    if (!shouldSkip) {
      startedAtRef.current = Date.now();
      setActive(true);
    }
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 1b) Replay on isolated route changes ONLY when they land on home: this
  //     instance persists in a layout (no remount per navigation), so a fresh
  //     boot starts each time the page below swaps and its data begins loading.
  //     Other destinations skip the boot splash — `PageTransitionLoader`
  //     supplies the light "Đang chuyển trang" overlay for them. Navigating
  //     INTO the arcade cancels instead — its own loading screen takes over.
  //     Nested navigations (`/shop` -> `/shop/{slug}`, `/profile` ->
  //     `/profile/orders`) keep the parent page mounted and swap only the
  //     child, so they are served by `PageTransitionLoader` too — no boot
  //     replay, and no boot-query gate to wait on.
  useEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname;
    // First mount is a cold load, already handled by effect 1 — not a swap.
    if (prev === null) return;
    if (pathname.startsWith("/gacha-mega")) {
      setSkip(true);
      setActive(false);
      return;
    }
    // Only the home route owns the boot splash — leaving home always hands
    // the transition to `PageTransitionLoader`. Deactivate (not just return):
    // a bare return strands a mid-cycle splash whose timers were cleared, so
    // browser back/forward could leave the boot overlay stacked on top.
    if (pathname !== "/") {
      setSkip(true);
      setActive(false);
      return;
    }
    if (classifyRouteTransition(prev, pathname) !== "isolated") return;
    startedAtRef.current = Date.now();
    doneRef.current = false;
    setDone(false);
    setSkip(false);
    setActive(true);
    setBootSettled(false);
    setPercent(START_PCT);
    setFading(false);
    setGone(false);
  }, [pathname]);

  // 2) Track the core page data via the React Query cache. Every cache event
  //    (and the initial snapshot) recomputes whether those queries have all
  //    settled with nothing still in flight. Chrome queries are excluded via
  //    CORE_QUERY_MATCHES so slow ones can't pin the splash.
  //    Queued, not synchronous: react-query fires cache subscribers while
  //    other components are reading queries during render, and setState there
  //    throws "Cannot update a component while rendering a different
  //    component".
  useEffect(() => {
    if (!active) return;
    const cache = queryClient.getQueryCache();
    const recompute = () => {
      const queries = cache.findAll();
      const matched = queries.filter((q) =>
        CORE_QUERY_MATCHES.some((m) => m(q.queryKey))
      );
      const anyFetching = matched.some(
        (q) => q.state.fetchStatus === "fetching"
      );
      const allSettled =
        matched.length > 0 &&
        matched.every((q) => {
          const { status, fetchStatus, fetchFailureCount } = q.state;
          if (status === "success" || status === "error") return true;
          // Disabled/no-op query (data already server-rendered, never
          // fetched, never failed) → counts as settled.
          return (
            status === "pending" &&
            fetchStatus === "idle" &&
            fetchFailureCount === 0
          );
        });
      setBootSettled(allSettled && !anyFetching);
    };
    recompute();
    const schedule = () => queueMicrotask(recompute);
    return cache.subscribe(schedule);
  }, [active, queryClient]);

  // 3) Finish at 100% only when the core data settled and the floor elapsed.
  //    Self-rescheduling: when data lands before minDuration (the common
  //    fast-load case) the effect must re-check at the earliest completion
  //    moment instead of silently bailing — otherwise the splash only hides
  //    via the fail-safe. A `bootSettled` dip mid-window clears the timer, so
  //    a brand-new query that hasn't started yet still postpones completion.
  useEffect(() => {
    if (doneRef.current || !active || gone) return;
    let completed = false;
    const finish = () => {
      if (completed || doneRef.current || gone) return;
      if (!bootSettled) return;
      const elapsed = Date.now() - (startedAtRef.current ?? Date.now());
      if (elapsed < minDuration + SETTLE_MS) return;
      completed = true;
      doneRef.current = true;
      setDone(true);
    };
    const remaining = Math.max(
      0,
      minDuration + SETTLE_MS - (Date.now() - (startedAtRef.current ?? Date.now()))
    );
    const t = setTimeout(finish, remaining);
    return () => clearTimeout(t);
  }, [bootSettled, minDuration, active, gone]);

  // Fail-safe: never trap the user behind the overlay on a stalled page.
  // Must be a true backstop — longer than the minDuration floor and the
  // typical fetch span, so it can never preempt the real data wait.
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => {
      if (doneRef.current || gone) return;
      doneRef.current = true;
      setDone(true);
    }, minDuration + FAILSAFE_MARGIN_MS);
    return () => clearTimeout(t);
  }, [active, gone, minDuration]);

  // 4) Visibility lifecycle: fade → unmount → stamp the session flag.
  useEffect(() => {
    if (!done) return;
    const t1 = setTimeout(() => setFading(true), 140);
    const t2 = setTimeout(() => {
      setGone(true);
      if (showOncePerSession && !forceShow) {
        try {
          sessionStorage.setItem(sessionKey, "1");
        } catch {
          /* sessionStorage unavailable — splash simply replays */
        }
      }
    }, 760);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [done, showOncePerSession, sessionKey, forceShow]);

  // 5) Drive the displayed % — a deterministic ramp from START_PCT to the
  //    RAMP_CEIL ceiling over `minDuration`, then a snap to 100 once the
  //    completion conditions pass. Always monotonic: it can never decrease.
  useEffect(() => {
    if (!active || gone) return;
    let latest = START_PCT;
    const tick = () => {
      const elapsed = Date.now() - (startedAtRef.current ?? Date.now());
      const ramp = Math.min(
        RAMP_CEIL,
        START_PCT + (elapsed / minDuration) * (RAMP_CEIL - START_PCT)
      );
      const rounded = Math.round(doneRef.current ? 100 : ramp);
      if (rounded !== latest) {
        latest = rounded;
        setPercent(rounded);
      }
    };
    tick();
    const id = setInterval(tick, RAMP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [active, gone, minDuration]);

  const status = done ? "Sẵn sàng trải nghiệm!" : "Đang tải dữ liệu NoobStore…";

  const ready = percent >= 100;
  // `active` guards the render as well: a deactivated overlay must never stay
  // in the DOM, otherwise back/forward away from home while a boot was mid-
  // cycle would leave it stacked over PageTransitionLoader's overlay.
  const showOverlay = active && !skip && !gone;

  return (
    <>
      {children}

      {showOverlay && (
        <div
          aria-hidden={fading}
          className={`fixed inset-0 z-[120] flex select-none flex-col justify-between overflow-hidden bg-surface text-on-surface transition-opacity duration-500 ${
            fading ? "opacity-0" : "opacity-100"
          }`}
        >
          {/* Ambient light orbs */}
          <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-orange-200/35 blur-3xl" />
          <div className="pointer-events-none absolute bottom-10 right-0 h-64 w-64 rounded-full bg-amber-100/40 blur-3xl" />

          {/* Warm grid background */}
          <div className="splash-grid-warm pointer-events-none absolute inset-0" />

          {/* ── Top status bar ── */}
          <header className="relative z-10 px-5 pb-2 pt-4">
            <div className="flex items-center justify-between border-b border-on-surface/5 pb-3">
              <div className="flex items-center gap-2">
                <div className="relative h-2 w-2">
                  <span className="absolute h-2 w-2 animate-ping rounded-full bg-primary" />
                  <span className="block h-2 w-2 rounded-full bg-primary" />
                </div>
                <span className="font-mono-tech text-xs font-bold uppercase tracking-widest text-on-surface/80">
                  noobstore.xyz <span className="text-primary/70">//</span> ver
                  2.5
                </span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-on-surface/10 bg-white/90 px-2.5 py-1 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="font-mono-tech text-xs font-bold uppercase tracking-wide text-on-surface">
                  Sys ready
                </span>
              </div>
            </div>
          </header>

          {/* ── Central hero branding ── */}
          <main className="relative z-10 mx-auto my-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-6 text-center">
            {/* 3D keycap switch emblem */}
            <div className="relative mb-7 flex items-center justify-center">
              <div className="splash-pulse-ring pointer-events-none absolute h-36 w-36 scale-110 rounded-3xl border border-primary/15" />
              <div className="pointer-events-none absolute h-44 w-44 animate-[splash-spin-rev_25s_linear_infinite] rounded-full border border-dashed border-primary/10" />
              <div className="splash-keycap relative flex h-28 w-28 flex-col items-center justify-center rounded-2xl p-2">
                <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-[#323130] to-[#1a1a19] shadow-inner">
                  <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg bg-on-surface/90">
                    <Image
                      src={LOGO_NOOB_STORE}
                      alt="NoobStore"
                      fill
                      className="h-full w-full object-cover drop-shadow-[0_2px_8px_rgba(255,100,100,0.4)]"
                    />
                  </div>
                  {/* <span className="font-mono-tech absolute left-1.5 top-1 rounded bg-black/30 px-1 text-[7px] font-medium tracking-tighter text-zinc-400">
                    ESC
                  </span>
                  <span className="font-mono-tech absolute bottom-1 right-1.5 text-[7px] font-medium text-zinc-400">
                    NB-01
                  </span> */}
                </div>
              </div>
            </div>

            {/* Brand typography */}
            <div className="mb-6 space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                <span>Custom Keyboards</span>
                <span className="text-primary/40">•</span>
                <span>Art Toys</span>
              </div>
              <h1 className="flex items-center justify-center gap-1 text-3xl font-extrabold tracking-tight text-on-surface">
                NoobStore
              </h1>
              <p className="px-4 text-xs font-medium leading-relaxed text-on-surface/50">
                Bàn phím cơ Custom, GMK Keycaps &amp; Phụ kiện tuyển chọn hàng
                đầu
              </p>
            </div>

            {/* Progress engine */}
            <div className="w-full space-y-2.5">
              <div className="relative h-2.5 w-full overflow-hidden rounded-full border border-on-surface/10 bg-surface-container-low p-0.5 shadow-inner">
                <div
                  className={`splash-progress-fill relative h-full rounded-full transition-[width] duration-300 ease-out ${
                    ready ? "splash-progress-ready" : ""
                  }`}
                  style={{ width: `${percent}%` }}
                >
                  {!ready && (
                    <div className="splash-shimmer pointer-events-none absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  )}
                </div>
              </div>

              <div className="font-mono-tech flex items-center justify-between gap-4 px-0.5 text-xs">
                <span className="max-w-[3/4] truncate text-left font-medium text-on-surface/70">
                  {status}
                </span>
                <span
                  className={`font-bold tracking-tight ${
                    ready ? "text-emerald-600" : "text-primary"
                  }`}
                >
                  {Math.round(percent)}%
                </span>
              </div>

              <div className="font-mono-tech flex items-center justify-center gap-2 border-t border-on-surface/5 pt-2 text-[10px] text-on-surface/40">
                <span>SWITCH: LUBED</span>
                <span>/</span>
                <span>ASSETS: LOADING</span>
                <span>/</span>
                <span className="font-semibold text-emerald-700">FPS: 60</span>
              </div>
            </div>
          </main>

          {/* ── Footer tip ── */}
          <footer className="relative z-10 mx-auto w-full max-w-md px-5 pb-5">
            <div className="mb-3 flex items-start space-x-3 rounded-2xl border border-primary/15 bg-white/95 p-3.5 shadow-[0_0_0_1px_rgba(255,255,255,0.8)_inset,0_18px_36px_-10px_rgba(155,63,28,0.18)]">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-orange-50 text-primary">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H4.5a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h17.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-primary">
                    Mẹo NoobStore
                  </span>
                  <span className="rounded bg-surface-container-low px-1.5 py-0.5 text-[9px] text-on-surface/50">
                    Gacha
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] font-medium leading-tight text-on-surface/75">
                  Đổi điểm tích lũy để nhận lượt quay Gacha và quà tặng giới hạn
                  tại mục{" "}
                  <Link
                    href="/gacha"
                    className="font-semibold text-on-surface underline decoration-primary/40 underline-offset-2"
                  >
                    Đổi Thưởng
                  </Link>
                  !
                </p>
              </div>
            </div>
            <p className="font-mono-tech text-center text-sm tracking-tight text-on-surface/40">
              © NOOBSTORE &amp; COLLECTIBLES • VIETNAM
            </p>
          </footer>

          <style>{`
            /* Warm grid background */
            .splash-grid-warm {
              background-size: 24px 24px;
              background-image:
                linear-gradient(to right, rgba(27, 28, 26, 0.035) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(27, 28, 26, 0.035) 1px, transparent 1px);
            }
            .font-mono-tech {
              font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
            }
            /* Tactile keycap plate */
            .splash-keycap {
              background: radial-gradient(130% 120% at 50% 10%, #ffffff 0%, #faede7 55%, #eedcd4 100%);
              border: 1px solid rgba(155, 63, 28, 0.18);
              box-shadow: 0 25px 50px -12px rgba(155, 63, 28, 0.35),
                0 6px 0 0 #7b2e11,
                0 0 0 1px rgba(255, 255, 255, 0.8) inset;
              animation: splash-keypress 2.4s ease-in-out infinite;
            }
            @keyframes splash-keypress {
              0%, 45%, 58%, 100% {
                transform: translateY(0);
                box-shadow: 0 25px 50px -12px rgba(155, 63, 28, 0.35),
                  0 6px 0 0 #7b2e11,
                  0 0 0 1px rgba(255, 255, 255, 0.8) inset;
              }
              50% {
                transform: translateY(5px);
                box-shadow: 0 12px 24px -6px rgba(155, 63, 28, 0.25),
                  0 1px 0 0 #7b2e11,
                  0 0 0 1px rgba(255, 255, 255, 0.8) inset;
              }
            }
            /* Soft pulse ring around the emblem */
            @keyframes splash-pulse {
              0%, 100% { opacity: 0.9; transform: scale(1); }
              50% { opacity: 0.55; transform: scale(1.06); }
            }
            .splash-pulse-ring {
              animation: splash-pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }
            @keyframes splash-spin-rev {
              from { transform: rotate(0deg); }
              to { transform: rotate(-360deg); }
            }
            /* Progress fill — terracotta gradient, green when done */
            .splash-progress-fill {
              background: linear-gradient(135deg, #9b3f1c 0%, #bb5732 100%);
              box-shadow: 0 0 12px rgba(155, 63, 28, 0.25);
            }
            .splash-progress-ready {
              background: linear-gradient(135deg, #4a7c3a 0%, #5c9a47 100%);
              box-shadow: 0 0 12px rgba(74, 124, 58, 0.35);
            }
            /* Shimmer light sweep */
            @keyframes splash-shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(200%); }
            }
            .splash-shimmer {
              animation: splash-shimmer 2s infinite linear;
            }
          `}</style>
        </div>
      )}
    </>
  );
}

function sessionSeen(key: string): boolean {
  try {
    return typeof window !== "undefined" && sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}
