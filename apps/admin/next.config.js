/** @type {import('next').NextConfig} */
const nextConfig = {
	serverExternalPackages: ["resend", "@upstash/redis"],
	experimental: {
		optimizePackageImports: ["lucide-react", "@supabase/ssr"],
	},
	images: {
		minimumCacheTTL: 86400,
		remotePatterns: [
			{ protocol: "https", hostname: "*.supabase.co" },
			{ protocol: "http", hostname: "*.supabase.co" },
			{ protocol: "https", hostname: "res.cloudinary.com" },
			{ protocol: "http", hostname: "res.cloudinary.com" },
		],
	},
};

module.exports = nextConfig;
