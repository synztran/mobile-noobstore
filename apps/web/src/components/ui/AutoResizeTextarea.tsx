"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

interface Props extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxHeight?: number;
}

export default function AutoResizeTextarea({
  value,
  maxHeight = 160,
  className,
  rows = 1,
  ...rest
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value, maxHeight]);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={rows}
      className={cn("resize-none overflow-hidden", className)}
      {...rest}
    />
  );
}
