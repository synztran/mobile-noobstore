"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface LazyNearViewportProps {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  className?: string;
}

export function LazyNearViewport({
  children,
  fallback,
  rootMargin = "500px 0px",
  className,
}: LazyNearViewportProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, visible]);

  return (
    <div ref={ref} className={`min-h-0 ${className ?? ""}`}>
      {visible ? children : (fallback ?? null)}
    </div>
  );
}
