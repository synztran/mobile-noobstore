"use client";

import dynamic from "next/dynamic";

/**
 * Client-side dynamic wrapper so framer-motion (CookieConsent's only heavy
 * dependency) is code-split out of the initial bundle and only fetched when
 * the consent banner actually mounts (after idle, and never for visitors who
 * already answered). Lighthouse: removes framer-motion from every page's
 * hydration graph.
 */
const LazyCookieConsent = dynamic(
  () =>
    import("@/components/ui/CookieConsent").then((m) => ({
      default: m.CookieConsent,
    })),
  { ssr: false }
);

export function CookieConsentLazy() {
  return <LazyCookieConsent />;
}
