import { Redis } from "@upstash/redis";

// Upstash Redis — HTTP-based, safe for Next.js serverless and Edge runtimes.
// Requires two env vars (set in .env.local and Vercel dashboard):
//   UPSTASH_REDIS_REST_URL   — e.g. https://xxx.upstash.io
//   UPSTASH_REDIS_REST_TOKEN — Upstash REST token
//
// Throws at startup if env vars are missing (intentional — misconfiguration
// should fail loudly rather than silently skip caching in production).
export const redis = new Redis({
	url: process.env.UPSTASH_REDIS_REST_URL!,
	token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
