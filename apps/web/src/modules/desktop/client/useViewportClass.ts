"use client";

import { useEffect, useRef, useState } from "react";

import { classifyViewport, watchViewportClass } from "../viewport";
import type { DeviceClass } from "../types";

/**
 * Live viewport-class hook — subscription over `watchViewportClass`.
 *
 * Returns the behavioral viewport band ("mobile" < 768px, "desktop" ≥ 768px —
 * tablets land in "desktop"), updating the moment the class flips: rotation,
 * window resize, or devtools device emulation. No resize handlers, no
 * throttling — two boundary `matchMedia` listeners do all the work.
 *
 * SSR/hydration: renders `initialClass` on the server and first client render,
 * then swaps to the measured class in an effect. Pass the server-known class
 * (e.g. from `getDeviceClass()`) to avoid any first-paint mismatch.
 *
 * ```tsx
 * const deviceClass = useViewportClass("desktop");
 * if (deviceClass === "mobile") return <MobileVariant />;
 * ```
 */
export function useViewportClass(
  initialClass: DeviceClass = "desktop"
): DeviceClass {
  // Lazy-init from the live window so a client-only mount never renders the
  // wrong band for even one frame.
  const [deviceClass, setDeviceClass] = useState<DeviceClass>(() => {
    if (typeof window === "undefined") return initialClass;
    try {
      return classifyViewport(window.innerWidth);
    } catch {
      return initialClass;
    }
  });

  // Ref mirror so the effect's re-sync reads the latest state without
  // re-subscribing on every value change.
  const latest = useRef(deviceClass);
  latest.current = deviceClass;

  useEffect(() => {
    const watch = watchViewportClass((next) => {
      latest.current = next;
      setDeviceClass(next);
    });
    // Re-sync in case the class flipped between render and effect.
    const live = watch.get();
    if (live !== null && live !== latest.current) {
      latest.current = live;
      setDeviceClass(live);
    }
    return () => watch.stop();
  }, []);

  return deviceClass;
}
