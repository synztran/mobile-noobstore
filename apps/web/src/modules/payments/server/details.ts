import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { vietQR } from "../vietqr";
import { hasUnquotedShippingFee } from "@/lib/shipping-method";
import { queuePaymentAlert } from "./security-alerts";

// Reviewed bank BINs. Unknown bank configuration fails closed; never guess.
const BANK_BINS: Record<string, string> = {
  vcb: "970436", vietcombank: "970436", tcb: "970407", techcombank: "970407",
  mb: "970422", mbbank: "970422", acb: "970416", bidv: "970418",
  vtb: "970415", vietinbank: "970415", vpb: "970432", vpbank: "970432",
  tpb: "970423", tpbank: "970423", stb: "970403", sacombank: "970403",
  vib: "970441", msb: "970426", ocb: "970448", hdbank: "970437",
  agribank: "970405", shb: "970443", seabank: "970440", eximbank: "970431",
};

export async function paymentDetails(identifier: string) {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 } as const;
  const columns = "id, order_number, status, total_price, shipping_fee, shipping_method_id, voucher_discount_amount, shipping_discount_amount, payment_type, deposit_amount, deposit_paid_at, paid_at";
  let result = await session.from("orders").select(columns).eq("user_id", user.id).eq("order_number", identifier).maybeSingle();
  if (!result.data && /^[0-9a-f-]{36}$/i.test(identifier)) {
    result = await session.from("orders").select(columns).eq("user_id", user.id).eq("id", identifier).maybeSingle();
  }
  if (result.error) throw new Error("Cannot load payment order");
  if (!result.data) return { error: "Order not found", status: 404 } as const;
  return paymentDetailsForOrder(result.data);
}

/** Trusted server callers only; customer entry points must use owner-scoped paymentDetails. */
export async function paymentDetailsForOrder(order: {
  id: string; order_number: string; status: string; total_price: number;
  shipping_fee: number | null; shipping_method_id: string | null;
  voucher_discount_amount: number; shipping_discount_amount: number;
  payment_type: string; deposit_amount: number | null;
}) {
  const admin = getAdminClient();
  const [receipts, bankResult] = await Promise.all([
    (admin.from as any)("order_payment_receipts").select("amount").eq("order_id", order.id),
    admin.from("payment_information").select("id, platform_name, account_number, account_name").eq("platform_type", "bank").order("created_at").limit(1).maybeSingle(),
  ]);
  if (receipts.error || bankResult.error) throw new Error("Cannot load verified payment details");
  const received = (receipts.data as { amount: number }[]).reduce((sum, receipt) => sum + Number(receipt.amount), 0);
  const total = Number(order.total_price);
  const deposit = Number(order.deposit_amount ?? 0);
  if (![received, total, deposit].every(Number.isSafeInteger)) throw new Error("Invalid payment amount");
  const active = !["cancelled", "refunded", "returning"].includes(order.status);
  const target = order.payment_type === "deposit_cod" && received < deposit ? deposit : total;
  const amountDue = active ? Math.max(0, target - received) : 0;
  const bank = bankResult.data;
  if (bank) {
    // Independent deployment trust anchor: a database edit alone cannot redirect
    // customers. Configure only bank identities checked in the store banking app.
    const identity = `${bank.platform_name.toLowerCase().replace(/[\s_-]/g, "")}:${bank.account_number.replace(/\s/g, "")}`;
    const allowed = (process.env.PAYMENT_BANK_ALLOWLIST ?? "").split(",").map(value => value.trim());
    if (!allowed.includes(identity)) {
      await queuePaymentAlert("recipient_mismatch", bank.id);
      throw new Error("Receiving bank is not deployment-approved");
    }
  }
  let payload: string | null = null;
  if (bank && amountDue > 0) {
    const name = bank.platform_name.toLowerCase().replace(/[\s_-]/g, "");
    const bin = BANK_BINS[name] ?? (/^970\d{3}$/.test(name) ? name : null);
    if (bin) payload = vietQR(bin, bank.account_number.replace(/\s/g, ""), amountDue, order.order_number);
  }
  return { data: {
    orderId: order.id, orderNumber: order.order_number, total, received, amountDue,
    shippingFee: Number(order.shipping_fee ?? 0), voucherDiscount: Number(order.voucher_discount_amount ?? 0),
    shippingFeePending: hasUnquotedShippingFee(order.shipping_method_id, Number(order.shipping_fee ?? 0)),
    shippingDiscount: Number(order.shipping_discount_amount ?? 0),
    balanceDue: Math.max(0, total - received), active, bank,
    qrUrl: payload ? `/api/orders/${encodeURIComponent(order.id)}/payment/qr` : null,
  }, payload } as const;
}
