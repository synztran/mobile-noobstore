/** @type {import('next').NextConfig} */
const nextConfig = {
  // Type-checking is handled by CI (`yarn type-check`), so skip the duplicate
  // tsc pass inside `next build` to keep production deploys fast.
  typescript: { ignoreBuildErrors: true },

  // Externalize large server-only packages so they're require()'d at runtime
  // instead of bundled into every serverless function — faster cold starts.
  serverExternalPackages: ["resend", "@upstash/redis"],

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
    // Serve images straight from Supabase Storage (WebP originals) instead of
    // Vercel's optimizer. Vercel's image optimization has a monthly request
    // quota; when exhausted it returns HTTP 402 for any cache-miss width
    // (`x-vercel-error: OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED`), which
    // broke product gallery images that hadn't been cached yet.
    unoptimized: true,
    // Cache optimized images on Vercel's image CDN for 24 h
    minimumCacheTTL: 86400,
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
