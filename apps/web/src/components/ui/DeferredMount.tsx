"use client";

import { useEffect, useState, type ReactNode } from "react";

interface DeferredMountProps {
  children: ReactNode;
  timeoutMs?: number;
}

export function DeferredMount({ children, timeoutMs = 4000 }: DeferredMountProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const mount = () => {
      if (!cancelled) setReady(true);
    };

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(mount, { timeout: timeoutMs });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }

    const timer = setTimeout(mount, timeoutMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [timeoutMs]);

  return ready ? <>{children}</> : null;
}