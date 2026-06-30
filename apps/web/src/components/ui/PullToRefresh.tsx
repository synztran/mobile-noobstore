"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

interface PullToRefreshProps {
  children: React.ReactNode;
  threshold?: number;
}

export function PullToRefresh({
  children,
  threshold = 60,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);
  const currentDist = useRef(0);

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY > 0 || refreshing) return;
    startY.current = e.touches[0].clientY;
    isPulling.current = true;
  }, [refreshing]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling.current || refreshing) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      const dist = Math.min(diff * 0.4, 150);
      currentDist.current = dist;
      setPullDistance(dist);
    }
  }, [refreshing]);

  const onTouchEnd = useCallback(() => {
    if (!isPulling.current) return;
    isPulling.current = false;
    if (currentDist.current >= threshold) {
      setRefreshing(true);
      currentDist.current = 0;
      setTimeout(() => window.location.reload(), 300);
    } else {
      currentDist.current = 0;
      setPullDistance(0);
    }
  }, [threshold]);

  useEffect(() => {
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  const showIndicator = pullDistance > 0;

  return (
    <div className="relative">
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{
          height: showIndicator ? pullDistance : 0,
          transition: isPulling.current
            ? "none"
            : "height 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        {refreshing ? (
          <span className="loading loading-spinner loading-sm text-primary" />
        ) : (
          <svg
            className={`text-primary transition-transform duration-200 ${
              pullDistance >= threshold ? "rotate-180" : ""
            }`}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        )}
      </div>
      {children}
    </div>
  );
}
