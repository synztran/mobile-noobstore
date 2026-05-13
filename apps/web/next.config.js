/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		// Cache optimized images on Vercel's image CDN for 24 h
		minimumCacheTTL: 86400,
		remotePatterns: [
			{
				protocol: "https",
				hostname: "*.supabase.co",
			},
			{
				protocol: "http",
				hostname: "*.supabase.co",
			},
			{
				protocol: "https",
				hostname: "res.cloudinary.com",
			},
			{
				protocol: "http",
				hostname: "res.cloudinary.com",
			},
			{
				protocol: "https",
				hostname: "lh3.googleusercontent.com",
			},
			{
				protocol: "https",
				hostname: "images.unsplash.com",
			},
			{
				protocol: "https",
				hostname: "via.placeholder.com",
			},
			{
				protocol: "https",
				hostname: "omnitype.com",
			},
		],
	},
	transpilePackages: ["gooey-toast"],
};

module.exports = nextConfig;
