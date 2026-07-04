"use client";

import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

type Position = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  children: React.ReactElement;
  content: React.ReactNode;
  position?: Position;
  className?: string;
  delay?: number;
}

export function Tooltip({
  children,
  content,
  position = "top",
  className = "",
  delay = 300,
}: TooltipProps) {
  const id = useId();
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  }, [delay]);

  const hide = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  }, []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const safeTop = 12;
    const safeBottom = window.innerHeight - 12;

    let top = 0;
    let left = 0;

    switch (position) {
      case "top":
        top = triggerRect.top - tooltipRect.height - 8;
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        if (top < safeTop) {
          top = triggerRect.bottom + 8;
        }
        break;
      case "bottom":
        top = triggerRect.bottom + 8;
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        if (top + tooltipRect.height > safeBottom) {
          top = triggerRect.top - tooltipRect.height - 8;
        }
        break;
      case "left":
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.left - tooltipRect.width - 8;
        if (left < 12) {
          left = triggerRect.right + 8;
        }
        break;
      case "right":
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.right + 8;
        if (left + tooltipRect.width > window.innerWidth - 12) {
          left = triggerRect.left - tooltipRect.width - 8;
        }
        break;
    }

    top = Math.max(safeTop, Math.min(top, safeBottom - tooltipRect.height));
    left = Math.max(12, Math.min(left, window.innerWidth - tooltipRect.width - 12));

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }, [position]);

  useEffect(() => {
    if (visible) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [visible, updatePosition]);

  const trigger = cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
    "aria-describedby": id,
  } as Record<string, unknown>);

  return (
    <>
      {trigger}
      {visible && (
        <div
          ref={tooltipRef}
          id={id}
          role="tooltip"
          className={`fixed z-[9999] rounded-lg bg-on-surface px-3 py-1.5 text-xs font-semibold text-surface shadow-ambient-sm ${className}`}
        >
          {content}
        </div>
      )}
    </>
  );
}
