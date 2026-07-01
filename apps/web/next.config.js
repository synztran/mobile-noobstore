/** @type {import('next').NextConfig} */
const nextConfig = {
  // Externalize large server-only packages so they're require()'d at runtime
  // instead of bundled into every serverless function — faster cold starts.
  serverExternalPackages: ["resend", "@upstash/redis"],

  experimental: {
    // Enables per-import tree-shaking for icon and UI libraries.
    // Next.js rewrites e.g. `import { X } from "lucide-react"` to a direct
    // path import, so only the used icons are included in each bundle.
    optimizePackageImports: ["@supabase/ssr", "lucide-react", "framer-motion"],
  },

  images: {
    // Cache optimized images on Vercel's image CDN for 24 h
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "via.placeholder.com" },
      { protocol: "https", hostname: "omnitype.com" },
    ],
  },
  transpilePackages: ["gooey-toast"],
};

module.exports = nextConfig;
