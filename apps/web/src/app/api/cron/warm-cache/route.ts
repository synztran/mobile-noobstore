import { requireCronSecret } from "@/lib/auth/requireCronSecret";
import { getFeesConfig } from "@/lib/fees";
import { getPaymentInformation } from "@/lib/payment-information";
import { getNoteworthyProducts } from "@/modules/products/server/ssr";
import {
	CACHE_KEYS,
	readThroughCache,
	setCacheStrict,
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
	const refreshFees = req.nextUrl.searchParams.get("refresh") === "fees";
	if (refreshFees) {
		try {
			const fees = await getFeesConfig();
			await setCacheStrict(CACHE_KEYS.fees, fees, 3600);
			return NextResponse.json({ warmed: 1, failed: 0, failedKeys: [] });
		} catch {
			return NextResponse.json(
				{ warmed: 0, failed: 1, failedKeys: [CACHE_KEYS.fees] },
				{ status: 500 },
			);
		}
	}

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
