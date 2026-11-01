import {
  PICKUP_CODE_TTL_MS,
  generatePickupCode,
  hashPickupCode,
  isPickupCodeExpired,
  isPickupCodeLocked,
  pickupCodeLockSecondsLeft,
} from "@/lib/pickup-code";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isPickupShippingMethod } from "@/lib/shipping-method";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PICKUP_CODE_RETRY_COOLDOWN_MS = 30 * 1000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const emailOnly = body?.email === true;

    // Email delivery is temporarily disabled while NoobStore selects a new
    // transactional email provider. Keep this endpoint fail-closed: never
    // return success for email-only mode when no email was sent.
    if (emailOnly) {
      return NextResponse.json(
        { error: "Email delivery is temporarily unavailable. Request the pickup code on screen." },
        { status: 503 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select(
        "id, status, payment_type, order_number, shipping_method_id, pickup_code_hash, pickup_code_expires_at, pickup_code_locked_until"
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to fetch order" },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!isPickupShippingMethod(order.shipping_method_id)) {
      return NextResponse.json(
        { error: "Đơn hàng này không phải đơn nhận tại cửa hàng." },
        { status: 400 }
      );
    }

    const fullyPaid =
    order.payment_type === "deposit_cod"
      ? order.status === "second_paid"
      : order.status === "confirmed";

    if (!fullyPaid) {
      return NextResponse.json(
        {
          error:
            "Chỉ tạo mã nhận hàng khi đơn hàng đã thanh toán đủ (đặt cọc cần thanh toán lần 1 và lần 2).",
        },
        { status: 400 }
      );
    }

    if (isPickupCodeLocked(order.pickup_code_locked_until)) {
      return NextResponse.json(
        {
          error: "Quá nhiều lần nhập sai. Vui lòng chờ 15 phút.",
          lockSecondsLeft: pickupCodeLockSecondsLeft(
            order.pickup_code_locked_until
          ),
        },
        { status: 429 }
      );
    }

    // Rotation throttle: a code was just created, so the customer probably
    // still has it on screen. Refuse regeneration for a short window to stop
    // hammering (each rotation invalidates the previous code).
    if (
      order.pickup_code_hash &&
      !isPickupCodeExpired(order.pickup_code_expires_at)
    ) {
      const createdAt =
        Date.parse(order.pickup_code_expires_at!) - PICKUP_CODE_TTL_MS;
      if (Date.now() - createdAt < PICKUP_CODE_RETRY_COOLDOWN_MS) {
        return NextResponse.json(
          {
            error: "Mã đã được tạo. Vui lòng đợi 30 giây để tạo mã mới.",
            cooldownSecondsLeft: Math.max(
              0,
              Math.ceil(
                (createdAt + PICKUP_CODE_RETRY_COOLDOWN_MS - Date.now()) / 1000
              )
            ),
          },
          { status: 429 }
        );
      }
    }

    // Generate a fresh code and persist only its hash (never plaintext).
    const code = generatePickupCode();
    const expiresAt = new Date(Date.now() + PICKUP_CODE_TTL_MS);

    // Write through the admin client — orders UPDATE is removed from user RLS.
    const admin = getAdminClient();
    const { error: updateError } = await admin
      .from("orders")
      .update({
        pickup_code_hash: hashPickupCode(code),
        pickup_code_expires_at: expiresAt.toISOString(),
        pickup_code_tries: 0,
        pickup_code_locked_until: null,
      })
      .eq("id", id);

    if (updateError) {
      console.error("[pickup-code] update error:", updateError);
      return NextResponse.json(
        { error: "Không thể tạo mã nhận hàng. Vui lòng thử lại." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      code,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[pickup-code] error:", error);
    return NextResponse.json(
      { error: "Failed to generate pickup code" },
      { status: 500 }
    );
  }
}
