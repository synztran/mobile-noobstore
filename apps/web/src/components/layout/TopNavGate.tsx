"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "@/components/layout/TopNav";

// Routes that render their own top navigation (back button, custom title, etc.)
// and therefore must NOT get the shared layout TopNav on top of it.
const SELF_RENDERED_PREFIXES = [
  "/shop/", // product detail pages render their own TopNav (back + favorite)
  "/services",
  "/policy",
  "/terms",
  "/delivery-terms",
  "/middleman",
  "/checkout",
  "/gacha-mega", // arcade renders its own full-screen header (back + token HUD)
];

export function TopNavGate() {
  const pathname = usePathname();

  if (SELF_RENDERED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return <TopNav />;
}
