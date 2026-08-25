import { requireCronSecret } from "@/lib/auth/requireCronSecret";
import { getBlogList } from "@/lib/blog-server";
import { getFeesConfig } from "@/lib/fees";
import { getPaymentInformation } from "@/lib/payment-information";
import {
	getNoteworthyProducts,
	getProductSeoData,
	getProductBySlug,
	getProductPurchaseCount,
	getRelatedProducts,
	getFrequentlyBoughtTogether,
	getQuickPickData,
	getProducts,
} from "@/lib/products-server";
import {
	CACHE_KEYS,
	buildProductListCacheKey,
	readThroughCache,
} from "@/lib/redis/cache";
import { getRewards } from "@/lib/rewards-server";
import { getSaleProducts } from "@/lib/sale-products-server";
import {
	getBookingConfigData,
	getServiceBySlug,
	getServicesList,
} from "@/lib/services-server";
import { getShippingMethods } from "@/lib/shipping-methods";
import { getPublicClient } from "@/lib/supabase/public";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─── POST /api/cron/warm-cache ────────────────────────────────────────────────
// Pre-populates the Redis cache for the global read endpoints so the first
// visitor to a page gets a cache hit instead of a full Supabase round trip.
// Triggered by a Supabase pg_cron job (migration 108) via pg_net, guarded by
// the shared CRON_SECRET check.
//
// Warms the default variants the UI actually requests. Parameterized endpoints
// (location/wards, non-default quick-pick category/product pages) are
// read-through cached on demand and are not warmed here.

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
		warm(CACHE_KEYS.paymentInformation, 86400, async () => {
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
		warm(CACHE_KEYS.testimonials, 60, async () => {
			const { data, error } = await getPublicClient()
				.from("testimonials")
				.select("id, name, rating, text, product, date")
				.eq("is_active", true)
				.order("order", { ascending: true })
				.limit(20);
			if (error) throw new Error(error.message);
			return data ?? [];
		}),
		warm(CACHE_KEYS.creators, 60, async () => {
			const { data, error } = await getPublicClient()
				.from("creators")
				.select(
					"id, name, role, image_url, social_handle, color_theme, bio",
				)
				.order("created_at", { ascending: false })
				.limit(4);
			if (error) throw new Error(error.message);
			return data ?? [];
		}),
		// Warm the shop page's first product list page — the shared slim key is
		// also used by /api/products and the shop SSR grid, so the first
		// visitor's infinite scroll and the SSR grid both hit cache instead of
		// the full query cascade (full-variant entries are only needed by the
		// quick-pick configurator and warm themselves on demand).
		warm(
			buildProductListCacheKey({ limit: 12, sort: "newest", slim: true }),
			600,
			() => getProducts({ limit: 12, sort: "newest", slim: true }),
		),
		// Warm the quick-pick category default the storefront drawer opens to
		// (keyboards on the home rail). Previously quick-pick was never warmed
		// and every open paid the full configurator/rules cascade.
		warm(
			CACHE_KEYS.quickPick("keyboards", "", "", "", "newest"),
			600,
			() => getQuickPickData({ categorySlug: "keyboards" }),
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

	// Warm the newest product detail pages so /shop/[slug] first visits hit
	// cache instead of the full query cascade. The getters self-cache in Redis.
	try {
		const seo = await getProductSeoData(24);
		const warmSlugs = seo.slice(0, 12);
		await Promise.allSettled(
			warmSlugs.map(async (p) => {
				const product = await getProductBySlug(p.slug);
				if (!product) return;
				await Promise.allSettled([
					getProductPurchaseCount(product.id),
					getRelatedProducts(product.brand, product.slug, 8),
					getFrequentlyBoughtTogether(product.id),
				]);
			}),
		);
	} catch {
		failed.push("product-pages-warm");
	}

	return NextResponse.json({
		warmed: warmed.length,
		failed: failed.length,
		failedKeys: failed,
	});
}