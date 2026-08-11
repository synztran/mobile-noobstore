import {
	CACHE_KEYS,
	publicCacheHeaders,
	readThroughCache,
} from "@/lib/redis/cache";
import { getServiceBySlug, type Service } from "@/lib/services-server";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 120;

export type { Service } from "@/lib/services-server";

// ─── GET /api/services/[slug] ─────────────────────────────────────────────────
// Returns a single active service with its options and selectable values.

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ slug: string }> },
) {
	const { slug } = await params;

	try {
		const service = await readThroughCache<Service | null>(
			CACHE_KEYS.serviceDetail(slug),
			120,
			() => getServiceBySlug(slug),
		);

		if (!service) {
			return NextResponse.json(
				{ error: "Service not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json(service, { headers: publicCacheHeaders() });
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Failed to load service" },
			{ status: 500 },
		);
	}
}