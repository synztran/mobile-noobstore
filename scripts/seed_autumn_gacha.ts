/**
 * scripts/seed_autumn_gacha.ts
 *
 * One-time seed for the Autumn 2026 gacha event "Hộp Bí Mật Mùa Tựu Trường".
 * Based on docs/features/gacha-event-planning.md.
 *
 *   - Deactivates the event with id=1 (Hộp May Mắn Mùa Hè 2026)
 *   - Creates the new event (2026-09-01 → 2026-10-31, one-time free token)
 *   - Creates the "CMK Denim Keyset" product (puzzle-completion prize, hidden)
 *   - Creates 11 rewards (golden/rare point/rare puzzle are display-only weight=0)
 *   - Creates 5 missions
 *
 * Requires the DB migration 120_allow_gacha_rewards_zero_weight.sql to have been
 * applied (weight >= 0 check), or inserts for weight=0 rows will fail.
 *
 * Usage:
 *   npx tsx scripts/seed_autumn_gacha.ts
 *
 * Env required (apps/web/.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 */

/// <reference types="node" />
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const envFiles = [".env.local", ".env", "apps/web/.env.local", "apps/admin/.env.local"];
for (const file of envFiles) {
	const envPath = resolve(process.cwd(), file);
	if (!existsSync(envPath)) continue;
	for (const line of readFileSync(envPath, "utf-8").split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eq = trimmed.indexOf("=");
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq).trim();
		const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
		if (!(key in process.env)) process.env[key] = val;
	}
	break;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
	console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
	process.exit(1);
}

const admin = createClient(url, key);

const PRIMUS75_PRODUCT_ID = "e8bebad5-e337-4b0d-b16c-a4b1e8a7e1d0";

async function main() {
	// 1. Deactivate old summer event
	const { data: oldEvent, error: oldErr } = await admin
		.from("gacha_events")
		.update({ is_active: false })
		.eq("id", 1) // Hộp May Mắn Mùa Hè 2026
		.select("id, name, is_active")
		.single();
	if (oldErr) throw new Error(`deactivate old event: ${oldErr.message}`);
	console.log(`ℹ Deactivated event #${oldEvent.id} (${oldEvent.name})`);

	// 2. Create the new autumn event
	const { data: event, error: evErr } = await admin
		.from("gacha_events")
		.insert({
			name: "Hộp Bí Mật Mùa Tựu Trường 2026",
			description:
				"Quay máy gacha để nhận ngay những phần thưởng hấp dẫn! Nhận 1 token chào mừng khi sự kiện bắt đầu và hoàn thành nhiệm vụ để nhận thêm token.",
			start_at: "2026-09-01T00:00:00+07:00",
			end_at: "2026-10-31T23:59:59+07:00",
			free_tokens_per_grant: 1,
			free_token_interval_days: null, // one-time grant
			is_active: true,
		})
		.select("id")
		.single();
	if (evErr) throw new Error(`create event: ${evErr.message}`);
	console.log(`ℹ Created event #${event.id} (Hộp Bí Mật Mùa Tựu Trường 2026)`);

	// 3. Create CMK Denim Keyset product (puzzle-completion prize, hidden from store)
	const { data: keyset, error: prodErr } = await admin
		.from("products")
		.insert({
			name: "CMK Denim Keyset",
			slug: "gacha-cmk-denim-keyset",
			base_price: 1500000,
			product_type: "standard",
			is_active: false, // hidden, prize-only
			is_pre_order: false,
			disable_ratings: true,
			sold_count: 0,
			created_at: new Date().toISOString(),
		})
		.select("id")
		.single();
	if (prodErr && !/already exists|duplicate/i.test(prodErr.message)) {
		throw new Error(`create cmk denim keyset: ${prodErr.message}`);
	}
	const keysetId = prodErr ? null : keyset?.id;
	console.log(`ℹ CMK Denim Keyset product: ${keysetId ?? "(already exists, reused by slug)"}`);

	// 4. Rewards
	// reward_type 'product' → value = product_id; 'puzzle' → value = product_id of completed prize
	const rewards = [
		// ── Display-only (weight 0, never drawn; percent_display is the virtual % shown) ──
		{
			reward_type: "product",
			name: "🌟 Primus 75",
			description: "Giải thưởng vàng độc quyền — chỉ 1 người may mắn nhất!",
			value: PRIMUS75_PRODUCT_ID,
			thumbnail_url: null,
			weight: 0,
			max_quantity: 1,
			is_golden: true,
			percent_display: 0.5,
		},
		{
			reward_type: "point",
			name: "100.000 Điểm Thưởng",
			description: "Siêu điểm thưởng dành cho người may mắn",
			value: "100000",
			thumbnail_url: null,
			weight: 0,
			max_quantity: null,
			is_golden: false,
			percent_display: 1.5,
		},
		{
			reward_type: "puzzle",
			name: "Mảnh Ghép Denim Keyset #2",
			description: "Mảnh hiếm #2 — thu thập đủ 4 mảnh (1,2,3,4) để nhận CMK Denim Keyset!",
			value: keysetId ?? PRIMUS75_PRODUCT_ID,
			thumbnail_url: null,
			weight: 0,
			max_quantity: 100,
			is_golden: false,
			percent_display: 3.0,
		},
		// ── Active pool (weight > 0) ──
		{
			reward_type: "point",
			name: "2.000 Điểm Thưởng",
			description: "Tích lũy điểm để đổi ưu đãi mua sắm",
			value: "2000",
			thumbnail_url: null,
			weight: 60,
			max_quantity: null,
			is_golden: false,
			percent_display: 6.0,
		},
		{
			reward_type: "point",
			name: "1.000 Điểm Thưởng",
			description: "Tích lũy điểm để đổi ưu đãi mua sắm",
			value: "1000",
			thumbnail_url: null,
			weight: 160,
			max_quantity: null,
			is_golden: false,
			percent_display: 16.0,
		},
		{
			reward_type: "puzzle",
			name: "Mảnh Ghép Denim Keyset #1",
			description: "Thu thập đủ 4 mảnh (1,2,3,4) để nhận CMK Denim Keyset!",
			value: keysetId ?? PRIMUS75_PRODUCT_ID,
			thumbnail_url: null,
			weight: 30,
			max_quantity: 100,
			is_golden: false,
			percent_display: 3.0,
		},
		{
			reward_type: "puzzle",
			name: "Mảnh Ghép Denim Keyset #3",
			description: "Thu thập đủ 4 mảnh (1,2,3,4) để nhận CMK Denim Keyset!",
			value: keysetId ?? PRIMUS75_PRODUCT_ID,
			thumbnail_url: null,
			weight: 30,
			max_quantity: 100,
			is_golden: false,
			percent_display: 3.0,
		},
		{
			reward_type: "puzzle",
			name: "Mảnh Ghép Denim Keyset #4",
			description: "Thu thập đủ 4 mảnh (1,2,3,4) để nhận CMK Denim Keyset!",
			value: keysetId ?? PRIMUS75_PRODUCT_ID,
			thumbnail_url: null,
			weight: 30,
			max_quantity: 100,
			is_golden: false,
			percent_display: 3.0,
		},
		{
			reward_type: "point",
			name: "500 Điểm Thưởng",
			description: "Tích lũy điểm để đổi ưu đãi mua sắm",
			value: "500",
			thumbnail_url: null,
			weight: 240,
			max_quantity: null,
			is_golden: false,
			percent_display: 24.0,
		},
		{
			reward_type: "point",
			name: "100 Điểm Thưởng",
			description: "Tích lũy điểm để đổi ưu đãi mua sắm",
			value: "100",
			thumbnail_url: null,
			weight: 100,
			max_quantity: null,
			is_golden: false,
			percent_display: 10.0,
		},
		{
			reward_type: "lucky_text",
			name: "Chúc bạn may mắn lần sau!",
			description: "Một lời nhắn nhủ ấm áp từ cửa hàng 🍀",
			value: "Cảm ơn bạn đã tham gia! Hãy thử lại lần sau nhé.",
			thumbnail_url: null,
			weight: 300,
			max_quantity: null,
			is_golden: false,
			percent_display: 30.0,
		},
	];

	for (const r of rewards) {
		const { error: rErr } = await admin
			.from("gacha_rewards")
			.insert({ ...r, event_id: event.id, is_active: true });
		if (rErr) throw new Error(`create reward "${r.name}": ${rErr.message}`);
		console.log(`  ✓ reward: ${r.name} (weight ${r.weight}, show ${r.percent_display}%)`);
	}

	// 5. Missions
	const missions = [
		{
			name: "Đăng Nhập Chào Mừng",
			description: "Đăng nhập vào NoobStore để nhận ngay token chào mừng 🎉",
			mission_type: "login_count",
			requirement: { count: 1 },
			token_reward: 1,
		},
		{
			name: "Mua Sắm Đầu Tay",
			description: "Hoàn thành 1 đơn hàng bất kỳ trong thời gian sự kiện",
			mission_type: "order_count",
			requirement: { count: 1 },
			token_reward: 2,
		},
		{
			name: "Tín Đồ Mua Sắm",
			description: "Hoàn thành 3 đơn hàng trong thời gian sự kiện",
			mission_type: "order_count",
			requirement: { count: 3 },
			token_reward: 3,
		},
		{
			name: "Chi Tiêu Lớn",
			description: "Mua hàng tổng giá trị từ 1.000.000₫ trở lên",
			mission_type: "spend_amount",
			requirement: { amount: 1000000 },
			token_reward: 3,
		},
		{
			name: "Chơi Liên Tục",
			description: "Quay máy gacha 5 lần trong sự kiện này",
			mission_type: "play_count",
			requirement: { count: 5 },
			token_reward: 2,
		},
	];

	for (const m of missions) {
		const { error: mErr } = await admin
			.from("gacha_missions")
			.insert({ ...m, event_id: event.id, is_active: true, show_trigger: true });
		if (mErr) throw new Error(`create mission "${m.name}": ${mErr.message}`);
		console.log(`  ✓ mission: ${m.name} (+${m.token_reward} token)`);
	}

	console.log("\nDone. Event id =", event.id);
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error("✗ Seed failed:", err);
		process.exit(1);
	});