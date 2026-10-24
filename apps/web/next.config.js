/** @type {import('next').NextConfig} */
const nextConfig = {
  // Type-checking is handled by CI (`yarn type-check`), so skip the duplicate
  // tsc pass inside `next build` to keep production deploys fast.
  typescript: { ignoreBuildErrors: true },

  // Externalize large server-only packages so they're require()'d at runtime
  // instead of bundled into every serverless function — faster cold starts.
  serverExternalPackages: ["resend", "@upstash/redis", "bwip-js", "isomorphic-dompurify", "jsdom"],

  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // Script nonces need a separate Next.js rendering/caching rollout. These
      // directives add protection without pretending unsafe-inline is strict CSP.
      { key: "Content-Security-Policy", value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'" },
      // Script reporting paused until a tested nonce/hash rollout: normal Next.js
      // inline scripts generated report storms. Enforced policy above remains.
    ] }];
  },

  // /new-release content moved into the aggregated /news hub
  async redirects() {
    return [
      {
        source: "/new-release",
        destination: "/news?type=release",
        permanent: false,
      },
    ];
  },

  experimental: {
    // Enables per-import tree-shaking for icon and UI libraries.
    // Next.js rewrites e.g. `import { X } from "lucide-react"` to a direct
    // path import, so only the used icons are included in each bundle.
    optimizePackageImports: ["@supabase/ssr", "lucide-react", "motion"],
  },

  images: {
    // Aligned to real layout widths (mobile-first Tailwind containers: max-w-md
    // → max-w-4xl, rare 7xl=1280px). Trimmed from Next's default 16 candidate
    // widths so the Vercel optimizer writes far fewer variants (each unique
    // (url, w, q) is a cache write = billed transformation). 1920 ≈ desktop
    // 7xl × 1.5 retina; 2048/3840 dropped (most expensive variants).
    deviceSizes: [640, 750, 828, 1080, 1536, 1920],
    imageSizes: [32, 64, 96, 128, 256, 320, 384],

    // Write-once, read-many: 30d instead of 24h. Object URLs are immutable
    // (admin uploads stamp cache-control: immutable), so variants stay useful
    // long-term and the write → read ratio collapses.
    minimumCacheTTL: 2592000,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "http", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "via.placeholder.com" },
      { protocol: "https", hostname: "omnitype.com" },
    ],
  },
  transpilePackages: ["gooey-toast"],
};

module.exports = nextConfig;
