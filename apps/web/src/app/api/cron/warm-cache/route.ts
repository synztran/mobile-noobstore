import { requireCronSecret } from "@/lib/auth/requireCronSecret";
import { getFeesConfig } from "@/lib/fees";
import { getPaymentInformation } from "@/lib/payment-information";
import { getNoteworthyProducts } from "@/modules/products/server/ssr";
import {
	CACHE_KEYS,
	readThroughCache,
} from "@/lib/redis/cache";
import { getSaleProducts } from "@/modules/products/server/sale";
import { getShippingMethods } from "@/lib/shipping-methods";
import { getPublicClient } from "@/lib/supabase/public";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─── POST /api/cron/warm-cache ────────────────────────────────────────────────
// Pre-populates only home product sections/reviews and checkout configuration.
// Triggered by a Supabase pg_cron job (migration 108) via pg_net, guarded by
// the shared CRON_SECRET check.

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
		warm(CACHE_KEYS.fees, 3600, getFeesConfig),
		warm(CACHE_KEYS.paymentInformation, 3600, async () => {
			const methods = await getPaymentInformation();
			return { methods };
		}),
		warm(CACHE_KEYS.shippingMethods, 3600, getShippingMethods),
		warm(CACHE_KEYS.noteworthy("", 5), 1800, () =>
			getNoteworthyProducts({ categorySlug: "", limit: 5 }),
		),
		warm(
			CACHE_KEYS.saleProducts("", 5, "discount_desc"),
			1800,
			() =>
				getSaleProducts({
					categorySlug: "",
					limit: 5,
					sort: "discount_desc",
					excludeSoldOut: true,
				}),
		),
		warm(CACHE_KEYS.testimonials, 1800, async () => {
			const { data, error } = await getPublicClient()
				.from("testimonials")
				.select("id, name, rating, text, product, date")
				.eq("is_active", true)
				.order("order", { ascending: true })
				.limit(20);
			if (error) throw new Error(error.message);
			return data ?? [];
		}),
	]);

	return NextResponse.json({
		warmed: warmed.length,
		failed: failed.length,
		failedKeys: failed,
	});
}
