import { NextRequest, NextResponse } from "next/server";
import bwipjs from "bwip-js";
import { getAdminClient } from "@/lib/supabase/admin";
import { paymentAdmin } from "@/lib/payment-auth";
import { paymentQrStages } from "@/lib/payment-qr";
import { vietQR } from "@web-vietqr";
import { bankBinFor, normalizeBankName } from "@web-bank-bins";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Re-render the payment QR codes a customer may have lost.
 *
 * Preview only: nothing is written to `payment_instruction_evidence`, so staff
 * opening this panel cannot inflate the evidence table. Amounts come from the
 * verified receipt ledger, and the receiving bank is the same first-created bank
 * row the storefront uses, so admin and customer never encode different accounts.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await paymentAdmin(req);
  if (auth.error) return auth.error;

  const { id } = await params;
  if (!uuid.test(id)) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }

  const db = getAdminClient();
  const [orderResult, receiptsResult, bankResult] = await Promise.all([
    db
      .from("orders")
      .select(
        "id, order_number, status, total_price, payment_type, deposit_amount, deposit_percentage"
      )
      .eq("id", id)
      .maybeSingle(),
    // New migration types must be regenerated with Supabase after deployment.
    (db.from as any)("order_payment_receipts").select("amount").eq("order_id", id),
    db
      .from("payment_information")
      .select("id, platform_name, account_number, account_name, bank_logo_url")
      .eq("platform_type", "bank")
      .order("created_at")
      .limit(1)
      .maybeSingle(),
  ]);

  if (orderResult.error || receiptsResult.error || bankResult.error) {
    return NextResponse.json(
      { error: "Cannot load payment details" },
      { status: 503 }
    );
  }
  const order = orderResult.data;
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const received = (receiptsResult.data as { amount: number }[]).reduce(
    (sum, receipt) => sum + Number(receipt.amount),
    0
  );
  const total = Number(order.total_price);
  const deposit = Number(order.deposit_amount ?? 0);
  let stages;
  try {
    stages = paymentQrStages({
      paymentType: order.payment_type,
      total,
      deposit,
      depositPercentage: order.deposit_percentage,
      received,
    });
  } catch {
    return NextResponse.json({ error: "Invalid payment amount" }, { status: 422 });
  }

  const bank = bankResult.data;
  const active = !["cancelled", "refunded", "returning"].includes(order.status);

  // A closed order keeps its ledger for reference but has nothing to collect,
  // so it must not fail on bank configuration.
  if (active && bank) {
    // Independent deployment trust anchor: a database edit alone cannot redirect
    // customers. Configure only bank identities checked in the store banking app.
    const identity = `${normalizeBankName(bank.platform_name)}:${bank.account_number.replace(/\s/g, "")}`;
    const allowed = (process.env.PAYMENT_BANK_ALLOWLIST ?? "")
      .split(",")
      .map((value) => value.trim());
    if (!allowed.includes(identity)) {
      return NextResponse.json(
        { error: "Receiving bank is not approved for this deployment" },
        { status: 409 }
      );
    }
  }

  const payload = {
    active,
    orderNumber: order.order_number,
    reference: order.order_number,
    bank: bank
      ? {
          platform_name: bank.platform_name,
          account_number: bank.account_number,
          account_name: bank.account_name,
          bank_logo_url: bank.bank_logo_url,
        }
      : null,
    stages: [] as {
      stage: string;
      label: string;
      amount: number;
      status: string;
      qrPng: string | null;
    }[],
  };

  if (active) {
    if (!bank) {
      return NextResponse.json(
        { error: "No receiving bank is configured" },
        { status: 409 }
      );
    }
    const bin = bankBinFor(bank.platform_name);
    if (!bin) {
      return NextResponse.json(
        { error: "Receiving bank is not supported by System" },
        { status: 409 }
      );
    }
    const account = bank.account_number.replace(/\s/g, "");

    for (const stage of stages) {
      let qrPng: string | null = null;
      if (stage.amount > 0) {
        try {
          const encoded = vietQR(bin, account, stage.amount, order.order_number);
          const png = await bwipjs.toBuffer({
            bcid: "qrcode",
            text: encoded,
            scale: 5,
            paddingwidth: 4,
            paddingheight: 4,
          });
          qrPng = png.toString("base64");
        } catch {
          return NextResponse.json(
            { error: "Cannot encode payment QR" },
            { status: 422 }
          );
        }
      }
      payload.stages.push({ ...stage, qrPng });
    }
  }

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
