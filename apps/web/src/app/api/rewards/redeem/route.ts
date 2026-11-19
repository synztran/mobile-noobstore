import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CACHE_KEYS, invalidateCache } from "@/lib/redis/cache";
import {
  earnPointsFixed,
  redeemDailyCheckinReward,
  spendPoints,
} from "@/lib/points/service";
import { randomBase36 } from "@/lib/random";
import {
  PointsCurrency,
  RewardItemType,
  type RedeemResponse,
} from "@/types/reward";
import {
  VoucherRewardType,
  VoucherScopeType,
} from "@/types/voucher";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type BenefitFormatter = (meta: Record<string, unknown>) => string;

const VOUCHER_BENEFIT_MAP = new Map<VoucherRewardType, BenefitFormatter>([
  [
    VoucherRewardType.FREE_SHIPPING,
    () => "Miễn phí vận chuyển",
  ],
  [
    VoucherRewardType.PERCENT_OFF,
    (meta) => {
      const cap = Number(meta.max_discount_amount ?? 0);
      return `Giảm ${meta.percent_off}%${cap > 0 ? ` (tối đa ${cap.toLocaleString("vi-VN")}₫)` : ""}`;
    },
  ],
  [
    VoucherRewardType.SHIPPING_PERCENT_OFF,
    (meta) => {
      const percent = Number(meta.percent_off ?? 100);
      const cap = Number(meta.max_discount_amount ?? 0);
      if (percent === 100) return "Miễn phí vận chuyển";
      return `Giảm ${percent}% phí vận chuyển${cap > 0 ? ` (tối đa ${cap.toLocaleString("vi-VN")}₫)` : ""}`;
    },
  ],
  [
    VoucherRewardType.AMOUNT_OFF,
    (meta) => {
      const amount = Number(meta.amount_off ?? 0);
      const max = Number(meta.max_discount_amount ?? 0);
      return `Giảm ${amount.toLocaleString("vi-VN")}₫${max > 0 ? ` (tối đa ${max.toLocaleString("vi-VN")}₫)` : ""}`;
    },
  ],
  [
    VoucherRewardType.SHIPPING_AMOUNT_OFF,
    (meta) => {
      const amount = Number(meta.amount_off ?? 0);
      return `Giảm ${amount.toLocaleString("vi-VN")}₫ phí vận chuyển`;
    },
  ],
]);

function getVoucherBenefit(meta: Record<string, unknown> | null): string {
  if (!meta) return "";
  const rewardType = meta.reward_type as VoucherRewardType | undefined;
  const formatter =
    (rewardType ? VOUCHER_BENEFIT_MAP.get(rewardType) : undefined) ??
    VOUCHER_BENEFIT_MAP.get(VoucherRewardType.AMOUNT_OFF);

  return formatter ? formatter(meta) : "";
}

const REDEMPTION_ERROR_MAP = new Map<string, string>([
  ["insufficient_points", "Không đủ điểm NSP"],
  ["reward_out_of_stock", "Phần thưởng đã hết"],
  ["reward_unavailable", "Phần thưởng không còn khả dụng"],
  ["invalid_redemption_request", "Yêu cầu đổi thưởng không hợp lệ"],
]);

const DEFAULT_REDEMPTION_ERROR_MESSAGE =
  "Không thể đổi phần thưởng lúc này. Vui lòng thử lại.";

function getRedemptionErrorMessage(errorText?: string): string {
  if (!errorText) return DEFAULT_REDEMPTION_ERROR_MESSAGE;

  for (const [condition, message] of REDEMPTION_ERROR_MAP) {
    if (errorText.includes(condition)) {
      return message;
    }
  }

  return DEFAULT_REDEMPTION_ERROR_MESSAGE;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = getAdminClient() as any;
    const sb = supabase as any;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const rewardItemId = body?.rewardItemId as string | undefined;
    if (!rewardItemId) {
      return NextResponse.json(
        { error: "Missing rewardItemId" },
        { status: 400 }
      );
    }

    // Fetch the reward item
    const { data: rewardRow, error: rewardError } = await admin
      .from("reward_items")
      .select("*")
      .eq("id", rewardItemId)
      .eq("is_active", true)
      .single();

    if (rewardError || !rewardRow) {
      return NextResponse.json(
        { error: "Reward not found or inactive" },
        { status: 404 }
      );
    }

    const row = rewardRow as Record<string, unknown>;
    const meta = (row.metadata as Record<string, unknown>) ?? {};

    // 1. Daily checkin currency redemption flow
    if (row.points_currency === PointsCurrency.DAILY_CHECKIN) {
      const result = await redeemDailyCheckinReward(
        admin,
        user.id,
        rewardItemId
      );
      await invalidateCache(CACHE_KEYS.pointsBalance(user.id));
      return NextResponse.json({
        success: true,
        rewardType: result.rewardType,
        voucherCode: result.voucherCode,
        voucherName: result.rewardName,
        pointsSpent: result.pointsSpent,
        newBalance: result.newBalance,
        benefit: getVoucherBenefit(meta),
      });
    }

    // 2. NSP currency redemption flow
    // Try the atomic RPC first (migration 163).
    const { data: redemption, error: redemptionError } = await admin.rpc(
      "redeem_nsp_reward",
      { p_user_id: user.id, p_reward_item_id: rewardItemId }
    );

    if (!redemptionError && redemption) {
      await invalidateCache(CACHE_KEYS.pointsBalance(user.id));
      return NextResponse.json(redemption as RedeemResponse);
    }

    // If RPC is missing from DB (PGRST202 schema cache error), fallback to client-side atomic execution
    const isRpcMissing =
      redemptionError?.code === "PGRST202" ||
      redemptionError?.message?.includes("Could not find the function");

    if (!isRpcMissing) {
      console.error("[rewards/redeem] atomic redemption failed", {
        userId: user.id,
        rewardItemId,
        error: redemptionError?.message,
      });
      const message = getRedemptionErrorMessage(redemptionError?.message);
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // --- FALLBACK REDEMPTION HANDLER ---
    const rewardType = row.reward_type as RewardItemType;
    const pointsCost = Number(row.points_cost);
    const stock = row.stock as number | null;

    if (stock !== null && (row.claimed_count as number) >= stock) {
      return NextResponse.json(
        { error: REDEMPTION_ERROR_MAP.get("reward_out_of_stock")! },
        { status: 400 }
      );
    }

    // Check user points balance
    const { data: userData } = await sb
      .from("users")
      .select("points_balance")
      .eq("id", user.id)
      .single();
    const currentBalance =
      (userData as { points_balance: number } | null)?.points_balance ?? 0;
    if (currentBalance < pointsCost) {
      return NextResponse.json(
        { error: REDEMPTION_ERROR_MAP.get("insufficient_points")! },
        { status: 400 }
      );
    }

    // Reserve unit via CAS
    const { data: reserved, error: reserveError } = await admin
      .from("reward_items")
      .update({
        claimed_count: (row.claimed_count as number) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rewardItemId)
      .eq("claimed_count", row.claimed_count)
      .select("id");

    if (reserveError || !reserved || reserved.length === 0) {
      return NextResponse.json(
        { error: "Phần thưởng vừa hết lượt, vui lòng thử lại" },
        { status: 400 }
      );
    }

    // Deduct points
    const spendResult = await spendPoints(
      admin,
      user.id,
      pointsCost,
      rewardType === RewardItemType.PRODUCT
        ? "product_exchange"
        : "voucher_exchange",
      rewardItemId,
      `Đổi "${row.name as string}"`
    );

    let finalResponse: RedeemResponse;

    if (rewardType === RewardItemType.VOUCHER) {
      const code = `RE-${randomBase36(8).toUpperCase()}`;
      const rawRewardType = meta.reward_type as VoucherRewardType | undefined;
      const rawScopeType = meta.scope_type as string | undefined;

      let voucherRewardType: VoucherRewardType = VoucherRewardType.AMOUNT_OFF;
      let voucherScopeType: VoucherScopeType = VoucherScopeType.ORDER_TOTAL;
      let percentOff: number | null =
        typeof meta.percent_off === "number" ? meta.percent_off : null;
      let amountOff: number | null =
        typeof meta.amount_off === "number" ? meta.amount_off : null;

      if (rawRewardType === VoucherRewardType.FREE_SHIPPING) {
        voucherRewardType = VoucherRewardType.SHIPPING_PERCENT_OFF;
        voucherScopeType = VoucherScopeType.ORDER_TOTAL;
        percentOff = 100;
        amountOff = null;
      } else if (rawScopeType === "shipping_fee") {
        voucherScopeType = VoucherScopeType.ORDER_TOTAL;
        if (rawRewardType === VoucherRewardType.AMOUNT_OFF) {
          voucherRewardType = VoucherRewardType.SHIPPING_AMOUNT_OFF;
        } else if (rawRewardType === VoucherRewardType.PERCENT_OFF) {
          voucherRewardType = VoucherRewardType.SHIPPING_PERCENT_OFF;
        }
      } else {
        voucherRewardType = rawRewardType || VoucherRewardType.AMOUNT_OFF;
        voucherScopeType =
          (rawScopeType as VoucherScopeType) || VoucherScopeType.ORDER_TOTAL;
      }

      const { data: newVoucher, error: insertError } = await admin
        .from("vouchers")
        .insert({
          code,
          name: row.name as string,
          description: (row.description as string) ?? null,
          status: "active",
          reward_type: voucherRewardType,
          scope_type: voucherScopeType,
          amount_off: amountOff,
          percent_off: percentOff,
          max_discount_amount:
            typeof meta.max_discount_amount === "number"
              ? meta.max_discount_amount
              : null,
          min_order_amount:
            typeof meta.min_order_amount === "number"
              ? meta.min_order_amount
              : 0,
          stackable: Boolean(meta.stackable),
          user_id: user.id,
          start_at: new Date().toISOString(),
          end_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: {},
        })
        .select("id")
        .single();

      if (insertError || !newVoucher) {
        console.error("[rewards/redeem] voucher insert failed", insertError);
        return NextResponse.json(
          { error: "Không thể tạo voucher. Vui lòng thử lại." },
          { status: 500 }
        );
      }

      await admin.from("reward_claims").insert({
        user_id: user.id,
        reward_item_id: rewardItemId,
        reward_type: RewardItemType.VOUCHER,
        points_spent: pointsCost,
        voucher_id: (newVoucher as Record<string, unknown>).id as string,
        metadata: { voucher_code: code },
      });

      finalResponse = {
        success: true,
        rewardType: RewardItemType.VOUCHER,
        voucherCode: code,
        voucherName: row.name as string,
        pointsSpent: pointsCost,
        newBalance: spendResult.newBalance,
        benefit: getVoucherBenefit(meta),
      };
    } else if (rewardType === RewardItemType.POINT) {
      const pointAmount = Number(meta.point_amount ?? 0);
      let newBalance = spendResult.newBalance;

      if (pointAmount > 0) {
        const earnResult = await earnPointsFixed(
          admin,
          user.id,
          "voucher_exchange",
          pointAmount,
          rewardItemId,
          `Đổi điểm: +${pointAmount} NSP từ "${row.name as string}"`
        );
        newBalance = earnResult.newBalance;
      }

      await admin.from("reward_claims").insert({
        user_id: user.id,
        reward_item_id: rewardItemId,
        reward_type: RewardItemType.POINT,
        points_spent: pointsCost,
        point_amount: pointAmount,
        metadata: {},
      });

      finalResponse = {
        success: true,
        rewardType: RewardItemType.POINT,
        pointAmount,
        pointsSpent: pointsCost,
        newBalance,
        benefit: `Nhận ${pointAmount} điểm NSP`,
      };
    } else {
      await admin.from("reward_claims").insert({
        user_id: user.id,
        reward_item_id: rewardItemId,
        reward_type: RewardItemType.PRODUCT,
        points_spent: pointsCost,
        product_ref: (meta.product_id as string) ?? null,
        metadata: meta,
      });

      finalResponse = {
        success: true,
        rewardType: RewardItemType.PRODUCT,
        productRef: (meta.product_id as string) ?? null,
        pointsSpent: pointsCost,
        newBalance: spendResult.newBalance,
        benefit: `Đã đổi "${row.name as string}"`,
      };
    }

    await invalidateCache(CACHE_KEYS.pointsBalance(user.id));
    return NextResponse.json(finalResponse);
  } catch (err) {
    console.error("[rewards/redeem] request failed", err);
    return NextResponse.json(
      { error: "Không thể đổi phần thưởng lúc này. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
