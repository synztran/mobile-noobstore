"use client";

import { useEffect, useRef } from "react";

/**
 * Drag-to-scroll for horizontal rails (product carousels) with a mouse.
 * Touch input is ignored — native momentum scrolling already handles it, so
 * mobile behavior is untouched. Links inside the rail stay clickable: a click
 * is only suppressed when the pointer actually moved (a drag).
 *
 * Images inside the rail get `draggable=false` + `-webkit-user-drag: none` so
 * starting a drag on a product photo can't trigger the browser's native HTML5
 * image drag, which otherwise hijacks the gesture (ghost image, pointer events
 * stop firing, scroll freezes mid-drag).
 */
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Native HTML5 drag on any child <img>/<a> would swallow the pointer
    // gesture — kill it for the whole subtree.
    const killNativeDrag = (e: Event) => e.preventDefault();
    el.addEventListener("dragstart", killNativeDrag);
    el.style.setProperty("-webkit-user-drag", "none");
    for (const img of el.querySelectorAll("img")) {
      img.draggable = false;
      img.style.setProperty("-webkit-user-drag", "none");
    }

    let startX = 0;
    let startScrollLeft = 0;
    let dragging = false;
    let moved = false;

    const onMouseDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startScrollLeft = el.scrollLeft;
    };

    const onMouseMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 5) {
        moved = true;
        // Force the grabbing cursor on the whole subtree — children (links,
        // cards) carry their own pointer cursors that would otherwise win.
        el.classList.add("drag-scrolling");
        el.style.userSelect = "none";
      }
      if (moved) {
        e.preventDefault();
        el.scrollLeft = startScrollLeft - dx;
      }
    };

    const endDrag = () => {
      dragging = false;
      el.classList.remove("drag-scrolling");
      el.style.userSelect = "";
    };

    const onClickCapture = (e: MouseEvent) => {
      // Swallow the click that follows a drag so cards/links don't navigate.
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    };

    el.addEventListener("pointerdown", onMouseDown);
    el.addEventListener("pointermove", onMouseMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointerleave", endDrag);
    el.addEventListener("click", onClickCapture, true);
    return () => {
      el.removeEventListener("dragstart", killNativeDrag);
      el.removeEventListener("pointerdown", onMouseDown);
      el.removeEventListener("pointermove", onMouseMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointerleave", endDrag);
      el.removeEventListener("click", onClickCapture, true);
    };
  }, []);

  return ref;
}
