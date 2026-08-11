import { requireCronSecret } from "@/lib/auth/requireCronSecret";
import { getBlogList } from "@/lib/blog-server";
import { getFeesConfig } from "@/lib/fees";
import { getPaymentInformation } from "@/lib/payment-information";
import { getNoteworthyProducts } from "@/lib/products-server";
import { CACHE_KEYS, readThroughCache } from "@/lib/redis/cache";
import { getRewards } from "@/lib/rewards-server";
import { getSaleProducts } from "@/lib/sale-products-server";
import {
	getBookingConfigData,
	getServiceBySlug,
	getServicesList,
} from "@/lib/services-server";
import { getShippingMethods } from "@/lib/shipping-methods";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─── POST /api/cron/warm-cache ────────────────────────────────────────────────
// Pre-populates the Redis cache for the global read endpoints so the first
// visitor to a page gets a cache hit instead of a full Supabase round trip.
// Triggered by a Supabase pg_cron job (migration 108) via pg_net, guarded by
// the shared CRON_SECRET check.
//
// Warms the default variants the UI actually requests. Parameterized endpoints
// (quick-pick, location/wards) are read-through cached on demand and are not
// warmed here.

export async function POST(req: NextRequest) {
	const authError = requireCronSecret(req);
	if (authError) return authError;

	const warmed: string[] = [];
	const failed: string[] = [];

	async function warm(
		key: string,
		ttl: number,
		fetcher: () => Promise<unknown>,
	) {
		try {
			await readThroughCache(key, ttl, fetcher);
			warmed.push(key);
		} catch {
			failed.push(key);
		}
	}

	await Promise.allSettled([
		warm(CACHE_KEYS.fees, 600, getFeesConfig),
		warm(CACHE_KEYS.paymentInformation, 300, async () => {
			const methods = await getPaymentInformation();
			return { methods };
		}),
		warm(CACHE_KEYS.shippingMethods, 300, getShippingMethods),
		warm(CACHE_KEYS.bookingConfig, 120, getBookingConfigData),
		warm(CACHE_KEYS.servicesList, 120, getServicesList),
		warm(CACHE_KEYS.blogList("", 1, 12), 300, () =>
			getBlogList("", 1, 12),
		),
		warm(CACHE_KEYS.rewards(0, 12), 120, () => getRewards(0, 12)),
		warm(CACHE_KEYS.noteworthy("", 5), 120, () =>
			getNoteworthyProducts({ categorySlug: "", limit: 5 }),
		),
		warm(
			CACHE_KEYS.saleProducts("", 5, "discount_desc"),
			120,
			() =>
				getSaleProducts({
					categorySlug: "",
					limit: 5,
					sort: "discount_desc",
					excludeSoldOut: true,
				}),
		),
	]);

	// Warm each service detail page from the booking-config slugs.
	try {
		const config = await getBookingConfigData();
		const slugs = new Set<string>();
		for (const section of config.sections) {
			for (const svc of section.services) {
				if (svc.slug) slugs.add(svc.slug);
			}
		}
		for (const slug of slugs) {
			await warm(CACHE_KEYS.serviceDetail(slug), 120, () =>
				getServiceBySlug(slug),
			);
		}
	} catch {
		failed.push("service-detail-warm");
	}

	return NextResponse.json({
		warmed: warmed.length,
		failed: failed.length,
		failedKeys: failed,
	});
}