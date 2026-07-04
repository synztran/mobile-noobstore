"use client";

import { useViewportHeight } from "@/hooks/useViewportHeight";

export function ViewportHeightProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useViewportHeight();

  return <>{children}</>;
}
