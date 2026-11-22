import { requireCronSecret } from "@/lib/auth/requireCronSecret";
import { getFeesConfig } from "@/lib/fees";
import { getPaymentInformation } from "@/lib/payment-information";
import { getNoteworthyProducts } from "@/modules/products/server/ssr";
import {
	CACHE_KEYS,
	CONFIG_CACHE_TTL,
	readThroughCache,
} from "@/lib/redis/cache";
import { getSaleProducts } from "@/modules/products/server/sale";
import { getShippingMethods } from "@/lib/shipping-methods";
import { createClient } from "@/lib/supabase/server";
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
		warm(CACHE_KEYS.fees, CONFIG_CACHE_TTL, getFeesConfig),
		warm(CACHE_KEYS.paymentInformation, CONFIG_CACHE_TTL, async () => {
			const methods = await getPaymentInformation();
			return { methods };
		}),
		warm(CACHE_KEYS.shippingMethods, CONFIG_CACHE_TTL, getShippingMethods),
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
            const supabase = await createClient();
            const { data, error } = await supabase
				.from("testimonials")
				.select("id, name, rating, text, product, date, image_url")
				.eq("is_active", true)
				.order("order", { ascending: true });
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
