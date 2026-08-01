/** @type {import('next').NextConfig} */
const nextConfig = {
	// Type-checking is handled by CI (`yarn type-check`), so skip the duplicate
	// tsc pass inside `next build` to keep production deploys fast.
	typescript: { ignoreBuildErrors: true },
	serverExternalPackages: ["resend", "@upstash/redis", "pdfkit"],
	experimental: {
		optimizePackageImports: ["lucide-react", "@supabase/ssr"],
	},
	images: {
		minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "http", hostname: "res.cloudinary.com" },
    ],
	},
};

module.exports = nextConfig;
