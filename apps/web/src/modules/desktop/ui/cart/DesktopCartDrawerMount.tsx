"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const DesktopCartDrawer = dynamic(
  () =>
    import("@/modules/desktop/ui/cart/DesktopCartDrawer").then((m) => ({
      default: m.DesktopCartDrawer,
    })),
  { ssr: false }
);

export function DesktopCartDrawerMount() {
  return (
    <Suspense fallback={null}>
      <DesktopCartDrawer />
    </Suspense>
  );
}