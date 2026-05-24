import { getCache, invalidateCache, setCache } from "@/lib/redis/cache";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─── GET /api/gacha?event_id=X ──────────────────────────────
// Returns: event info, rewards (with computed percent), user token count
export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const eventId = Number(searchParams.get("event_id"));

	if (!eventId || isNaN(eventId)) {
		return NextResponse.json(
			{ error: "event_id query param is required" },
			{ status: 400 },
		);
	}

	const supabase = await createClient();

	// Auth and cache lookup run in parallel
	const cacheKey = `gacha:event:${eventId}`;
	const [
		{
			data: { user },
		},
		cached,
	] = await Promise.all([
		supabase.auth.getUser(),
		getCache<{ event: unknown; rewards: unknown[] }>(cacheKey),
	]);

	let event: unknown;
	let rewardsWithPercent: unknown[];

	if (cached) {
		event = cached.event;
		rewardsWithPercent = cached.rewards;
	} else {
		const [eventResult, rewardsResult] = await Promise.all([
			supabase
				.from("gacha_events")
				.select(
					"id, name, description, start_at, end_at, free_tokens_per_grant, free_token_interval_days, is_active",
				)
				.eq("id", eventId)
				.eq("is_active", true)
				.maybeSingle(),
			supabase
				.from("gacha_rewards")
				.select(
					"id, reward_type, name, description, value, thumbnail_url, weight, max_quantity, claimed_count, is_golden, percent_display",
				)
				.eq("event_id", eventId)
				.order("percent_display", { ascending: true }),
		]);

		if (eventResult.error) {
			return NextResponse.json(
				{ error: eventResult.error.message },
				{ status: 500 },
			);
		}
		if (!eventResult.data) {
			return NextResponse.json(
				{ error: "Sự kiện chưa diễn ra" },
				{ status: 404 },
			);
		}
		if (rewardsResult.error) {
			return NextResponse.json(
				{ error: rewardsResult.error.message },
				{ status: 500 },
			);
		}

		const rewards = rewardsResult.data ?? [];
		const totalWeight = rewards.reduce(
			(sum, r) => sum + (r.weight ?? 0),
			0,
		);
		rewardsWithPercent = rewards.map((r) => {
			// const percent =
			// 	totalWeight > 0
			// 		? Math.round(((r.weight ?? 0) / totalWeight) * 1000) / 10
			// 		: 0;
			const {
				id,
				// is_golden,
				// max_quantity,
				// reward_type,
				weight,
				percent_display,
				...rest
			} = r;
			return {
				...rest,
				percent: r.percent_display,
			};
		});
		event = eventResult.data;

		// Cache event + rewards for 60 s (token_count is per-user, never cached)
		await setCache(cacheKey, { event, rewards: rewardsWithPercent }, 60);
	}

	let tokenCount = 0;
	if (user) {
		const { data: tokenRow } = await supabase
			.from("user_event_tokens")
			.select("token_count")
			.eq("user_id", user.id)
			.eq("event_id", eventId)
			.maybeSingle();
		tokenCount = tokenRow?.token_count ?? 0;
	}

	return NextResponse.json({
		event,
		rewards: rewardsWithPercent,
		token_count: tokenCount,
	});
}

// ─── POST /api/gacha ─────────────────────────────────────────
// Body: { event_id: number }
// Atomically deducts 1 token, runs weighted draw, records history
export async function POST(req: NextRequest) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: { event_id?: unknown };
	try {
		body = await req.json();
	} catch {
		return NextResponse.json(
			{ error: "Invalid request body" },
			{ status: 400 },
		);
	}

	const eventId = Number(body.event_id);
	if (!eventId || isNaN(eventId)) {
		return NextResponse.json(
			{ error: "event_id is required" },
			{ status: 400 },
		);
	}

	const admin = getAdminClient();

	// 1. Verify event is active and within date range
	// Use the authenticated SSR client here — gacha_events is readable by authenticated users via RLS.
	// The admin client is reserved for operations that bypass RLS (blocked-users check, reward updates).
	const { data: event, error: eventError } = await supabase
		.from("gacha_events")
		.select("id, start_at, end_at, is_active")
		.eq("id", eventId)
		.eq("is_active", true)
		.maybeSingle();

	if (eventError) {
		return NextResponse.json(
			{ error: eventError.message },
			{ status: 500 },
		);
	}
	if (!event) {
		return NextResponse.json(
			{ error: "Sự kiện chưa diễn ra" },
			{ status: 404 },
		);
	}

	const now = new Date();
	if (now < new Date(event.start_at) || now > new Date(event.end_at)) {
		return NextResponse.json(
			{ error: "Sự kiện chưa diễn ra" },
			{ status: 400 },
		);
	}

	// 2. Read current token count (use authed SSR client — RLS allows user to read own row)
	const { data: tokenRow, error: tokenError } = await supabase
		.from("user_event_tokens")
		.select("token_count")
		.eq("user_id", user.id)
		.eq("event_id", eventId)
		.maybeSingle();

	if (tokenError) {
		console.error("[gacha POST] token query error:", tokenError);
		return NextResponse.json(
			{ error: "Token query failed", detail: tokenError.message },
			{ status: 500 },
		);
	}

	const currentTokens = tokenRow?.token_count ?? 0;
	if (currentTokens <= 0) {
		return NextResponse.json(
			{ error: "Not enough tokens" },
			{ status: 400 },
		);
	}

	// 3. Atomic decrement with optimistic concurrency check (authed client — RLS allows user to update own row)
	const { data: updated, error: updateError } = await supabase
		.from("user_event_tokens")
		.update({ token_count: currentTokens - 1 })
		.eq("user_id", user.id)
		.eq("event_id", eventId)
		.eq("token_count", currentTokens)
		.select("id");

	if (updateError || !updated || updated.length === 0) {
		return NextResponse.json(
			{ error: "Token update conflict, please retry" },
			{ status: 409 },
		);
	}

	// 4. Check if user is blocked from golden rewards
	const { data: blocked } = await supabase
		.from("gacha_event_blocked_users")
		.select("user_id")
		.eq("event_id", eventId)
		.eq("user_id", user.id)
		.maybeSingle();

	const isGoldenBlocked = !!blocked;

	// 5. Fetch all rewards for this event
	const { data: allRewards, error: rewardsError } = await supabase
		.from("gacha_rewards")
		.select(
			"id, reward_type, name, description, value, thumbnail_url, weight, max_quantity, claimed_count, is_golden",
		)
		.eq("event_id", eventId);

	if (rewardsError || !allRewards || allRewards.length === 0) {
		// Refund token on configuration error
		await supabase
			.from("user_event_tokens")
			.update({ token_count: currentTokens })
			.eq("user_id", user.id)
			.eq("event_id", eventId);
		return NextResponse.json(
			{ error: "No rewards configured for this event" },
			{ status: 500 },
		);
	}

	// 6. Filter: exclude golden for blocked users; exclude exhausted supply
	const eligible = allRewards.filter((r) => {
		if (isGoldenBlocked && r.is_golden) return false;
		if (r.max_quantity !== null && r.claimed_count >= r.max_quantity)
			return false;
		return true;
	});

	if (eligible.length === 0) {
		await supabase
			.from("user_event_tokens")
			.update({ token_count: currentTokens })
			.eq("user_id", user.id)
			.eq("event_id", eventId);
		return NextResponse.json(
			{ error: "No eligible rewards available" },
			{ status: 409 },
		);
	}

	// 7. Weighted random draw
	const totalWeight = eligible.reduce((sum, r) => sum + (r.weight ?? 0), 0);
	let roll = Math.random() * totalWeight;
	let drawn = eligible[eligible.length - 1]; // safe fallback
	for (const reward of eligible) {
		roll -= reward.weight ?? 0;
		if (roll <= 0) {
			drawn = reward;
			break;
		}
	}

	// 8. Record history + increment claimed_count (always) + invalidate cache
	await Promise.all([
		supabase.from("gacha_history").insert({
			user_id: user.id,
			event_id: eventId,
			reward_id: drawn.id,
		}),
		admin
			.from("gacha_rewards")
			.update({ claimed_count: drawn.claimed_count + 1 })
			.eq("id", drawn.id),
		// Invalidate event cache (claimed_count changed) and recent-winners cache
		invalidateCache(`gacha:event:${eventId}`, `gacha:winners:${eventId}`),
	]);

	return NextResponse.json({ reward: drawn });
}
