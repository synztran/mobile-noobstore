"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const CartDrawer = dynamic(
  () =>
    import("@/modules/cart/ui/CartDrawer").then((m) => ({
      default: m.CartDrawer,
    })),
  { ssr: false }
);

export function MobileCartDrawerMount() {
  return (
    <Suspense fallback={null}>
      <CartDrawer />
    </Suspense>
  );
}