"use client";

import Script from "next/script";

const RUM_TOKEN = "6apxZqfkWTEP9SvzBcig6TEB";

/**
 * Better Stack Real User Monitoring (RUM).
 * Tracks page loads, web vitals, JS errors, and slow/breaking requests
 * from real browser sessions. Token is public by design (like a GA id).
 *
 * Loads with `lazyOnload` — the RUM bundle is ~360KB and burned ~1.6s of
 * main-thread CPU during page load when `afterInteractive` (worst offender
 * in the Lighthouse bootup-time table). Idle-time loading keeps telemetry
 * intact without taxing LCP/TBT.
 */
export function BetterStackRUM({ nonce }: { nonce?: string }) {
  const enabled = process.env.NEXT_PUBLIC_BETTERSTACK_RUM === "true";

  if (!enabled) return null;

  return (
    <Script id="betterstack-rum" nonce={nonce} strategy="lazyOnload">
      {`
        (function(b,e,t,r){
          b[t]=b[t]||function(...args){(b[t].q=b[t].q||[]).push(args)};
          b[t].l=+new Date;
          var s=e.createElement('script'); s.async=1; s.crossOrigin='anonymous';
          s.src='https://betterstack.net/b.js?t='+r;
          (e.head||e.getElementsByTagName('head')[0]).appendChild(s);
        })(window,document,'betterstack','${RUM_TOKEN}');
        betterstack('init', { environment: ${process.env.NEXT_PUBLIC_VERCEL_ENV ? JSON.stringify(process.env.NEXT_PUBLIC_VERCEL_ENV) : "'production'"} });
      `}
    </Script>
  );
}
