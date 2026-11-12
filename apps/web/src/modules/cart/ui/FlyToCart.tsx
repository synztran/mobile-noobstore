"use client";

import { useFlyToCartStore } from "@/modules/cart/client/hooks/useFlyToCart";
import Image from "@/components/ui/AdaptiveImage";
import { useCallback, useEffect, useRef } from "react";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function FlyToCart() {
  const { isAnimating, imageUrl, startRect, clearFly } = useFlyToCartStore();
  const elRef = useRef<HTMLDivElement>(null);

  const runAnimation = useCallback(() => {
    const cartEl = document.querySelector<HTMLElement>("[data-cart-icon]");
    if (!cartEl || !elRef.current) {
      clearFly();
      return;
    }

    const endRect = cartEl.getBoundingClientRect();

    const startX = startRect.left + startRect.width / 2;
    const startY = startRect.top + startRect.height / 2;
    const endX = endRect.left + endRect.width / 2;
    const endY = endRect.top + endRect.height / 2;

    elRef.current.style.display = "block";
    elRef.current.style.opacity = "1";
    elRef.current.style.transform = `translate(${startX}px, ${startY}px) scale(1)`;

    const duration = 600;
    const startTime = performance.now();

    let frameId: number;

    function tick(now: number) {
      if (!elRef.current) return;
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(t);

      const x = startX + (endX - startX) * eased;
      const peak = Math.min(startY, endY) - 60;
      const arc = startY + (endY - startY) * eased + Math.sin(eased * Math.PI) * (peak - (startY + (endY - startY) * eased));
      const scale = 1 - eased * 0.6;
      const opacity = 1 - eased;

      elRef.current.style.transform = `translate(${x}px, ${arc}px) scale(${scale})`;
      elRef.current.style.opacity = String(opacity);

      if (t < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        elRef.current.style.display = "none";
        clearFly();
      }
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [clearFly, startRect]);

  useEffect(() => {
    if (!isAnimating) return;
    const cleanup = runAnimation();
    return () => cleanup?.();
  }, [isAnimating, runAnimation]);

  return (
    <div
      ref={elRef}
      className="pointer-events-none fixed left-0 top-0 z-[9999] h-8 w-8 overflow-hidden rounded-full bg-surface shadow-float"
      style={{ display: "none", opacity: 0 }}
    >
      {imageUrl && (
        <Image
          src={imageUrl}
          alt=""
          fill
          className="object-cover"
          sizes="32px"
        />
      )}
    </div>
  );
}
