import { NextRequest, NextResponse } from "next/server";
import { generateAndStoreInvoice } from "@/lib/invoice";
import { invalidateProductCaches } from "@/lib/redis/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { loadQuickOrderPricingParents } from "@/lib/quick-order-catalog";
import type { Json } from "@db-types";
import {
  applyQuickOrderVoucher,
  isUuid,
  parseQuickOrderPayment,
  parseManualShippingFee,
  parseQuickOrderCustomer,
  parseQuickOrderLines,
  priceQuickOrderLines,
  QUICK_ORDER_MAX_VND,
} from "@/lib/quick-order";

export const dynamic = "force-dynamic";

function randomBase36(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => (byte % 36).toString(36)).join("").toUpperCase();
}

async function authorize() {
  const session = await createClient();
  const { data: { user }, error: authError } = await session.auth.getUser();
  if (authError || !user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: profile, error } = await session.from("users").select("role").eq("id", user.id).maybeSingle();
  if (error || profile?.role !== "admin") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user };
}

function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request: NextRequest) {
  const auth = await authorize();
  if ("error" in auth) return auth.error;
  const db = getAdminClient();
  const search = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  const [productsResult, vouchersResult, methodsResult] = await Promise.all([
    db.from("products").select("id, name, thumbnail, base_price, stock_quantity, max_quantity, product_type, is_active, is_pre_order, category_id, product_variants(id, product_id, variant_name, price_adjustment, stock_quantity, is_pre_order, pre_order_config, thumbnail)").eq("is_active", true).neq("product_type", "kit").ilike("name", `%${search.replace(/[%_,()]/g, " ")}%`).order("name").limit(100),
    db.from("vouchers").select("id, code, name, reward_type, scope_type, amount_off, percent_off, max_discount_amount, min_order_amount, min_item_quantity, applies_to_product_ids, applies_to_category_slugs, excluded_product_ids, applies_to_shipping_methods, customer_ids, usage_limit_total, used_count, start_at, end_at, status, deleted_at").eq("status", "active").is("deleted_at", null).order("code").limit(200),
    db.from("shipping_methods").select("id, name").order("name"),
  ]);
  if (productsResult.error || vouchersResult.error || methodsResult.error) return privateJson({ error: "Unable to load quick-order options." }, 503);
  const pricing = await loadQuickOrderPricingParents(db, (productsResult.data ?? []).filter((product) => product.product_type === "component").map((product) => product.id));
  if (pricing.error) return privateJson({ error: "Unable to load product pricing." }, 503);
  const categoryIds = [...new Set((productsResult.data ?? []).map((product) => product.category_id).filter((id): id is string => Boolean(id)))];
  const categoryResult = categoryIds.length ? await db.from("categories").select("id, slug").in("id", categoryIds) : { data: [], error: null };
  if (categoryResult.error) return privateJson({ error: "Unable to load product categories." }, 503);
  const categorySlugs = new Map((categoryResult.data ?? []).map((category) => [category.id, category.slug]));
  const products = (productsResult.data ?? []).map((product) => ({
    ...product,
    pricing_parents: pricing.parents.get(product.id) ?? [],
    base_price: pricing.parents.get(product.id)?.length === 1 ? pricing.parents.get(product.id)![0].base_price : product.base_price,
    category_slug: product.category_id ? categorySlugs.get(product.category_id) ?? null : null,
    product_variants: product.product_variants ?? [],
  }));
  const now = Date.now();
  const vouchers = (vouchersResult.data ?? []).filter((voucher) =>
    !voucher.customer_ids?.length &&
    !voucher.applies_to_shipping_methods?.length &&
    (!(voucher.usage_limit_total && voucher.used_count >= voucher.usage_limit_total)) &&
    (!voucher.start_at || new Date(voucher.start_at).getTime() <= now) &&
    (!voucher.end_at || new Date(voucher.end_at).getTime() >= now)
  );
  return privateJson({ products, vouchers, shippingMethods: methodsResult.data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await authorize();
  if ("error" in auth) return auth.error;
  const origin = request.headers.get("origin");
  try {
    if (!origin || new URL(origin).origin !== request.nextUrl.origin) return privateJson({ error: "Invalid request origin." }, 403);
  } catch {
    return privateJson({ error: "Invalid request origin." }, 403);
  }

  let body: unknown;
  try { body = await request.json(); } catch { return privateJson({ error: "Invalid JSON body." }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return privateJson({ error: "Invalid order." }, 400);
  const payload = body as Record<string, unknown>;
  const customer = parseQuickOrderCustomer(payload.customer);
  const linesInput = parseQuickOrderLines(payload.items);
  const shippingFee = parseManualShippingFee(payload.shipping_fee);
  if (!customer || !linesInput || shippingFee === null) return privateJson({ error: "Enter a customer name, delivery address, valid shipping fee, and at least one product." }, 400);
  if (payload.voucher_id !== null && payload.voucher_id !== undefined && !isUuid(payload.voucher_id)) return privateJson({ error: "Invalid voucher." }, 400);
  if (payload.shipping_method_id !== null && payload.shipping_method_id !== undefined && (typeof payload.shipping_method_id !== "string" || payload.shipping_method_id.length < 1 || payload.shipping_method_id.length > 100)) return privateJson({ error: "Invalid shipping method." }, 400);
  const shippingMethodId = (payload.shipping_method_id as string | null | undefined) ?? null;
  const paymentInput = payload.payment;
  if (!paymentInput || typeof paymentInput !== "object" || Array.isArray(paymentInput)) return privateJson({ error: "Choose a valid payment option." }, 400);

  const db = getAdminClient();
  const productIds = [...new Set(linesInput.map((line) => line.product_id))];
  const [productResult, variantResult] = await Promise.all([
    db.from("products").select("id, name, thumbnail, base_price, stock_quantity, max_quantity, product_type, is_active, is_pre_order, category_id").in("id", productIds),
    db.from("product_variants").select("id, product_id, variant_name, price_adjustment, stock_quantity, is_pre_order, pre_order_config, thumbnail").in("product_id", productIds),
  ]);
  if (productResult.error || variantResult.error) return privateJson({ error: "Unable to verify the selected products." }, 503);
  const pricing = await loadQuickOrderPricingParents(db, (productResult.data ?? []).filter((product) => product.product_type === "component").map((product) => product.id));
  if (pricing.error) return privateJson({ error: "Unable to verify product pricing." }, 503);
  const categoriesResult = await db.from("categories").select("id, slug");
  if (categoriesResult.error) return privateJson({ error: "Unable to verify product categories." }, 503);
  const slugsByCategory = new Map((categoriesResult.data ?? []).map((category) => [category.id, category.slug]));
  const products = (productResult.data ?? []).map((product) => ({ ...product, pricing_parents: pricing.parents.get(product.id) ?? [], category_slug: product.category_id ? slugsByCategory.get(product.category_id) ?? null : null }));
  const productVariants = (variantResult.data ?? []).flatMap((variant) => variant.product_id ? [{ ...variant, product_id: variant.product_id }] : []);
  const priced = priceQuickOrderLines(linesInput, products, productVariants);
  if (!priced) return privateJson({ error: "A product or variant is unavailable, out of stock, or has changed. Refresh and check the order." }, 409);
  const payment = parseQuickOrderPayment(paymentInput, priced.subtotal + shippingFee, priced.subtotal);
  if (!payment) return privateJson({ error: "Choose a valid payment option and deposit percentage." }, 400);
  const voucherId = (payload.voucher_id as string | null | undefined) ?? null;
  let voucherDiscount = 0;
  let shippingDiscount = 0;
  let voucherSnapshot: Json | null = null;
  let voucherCode: string | null = null;
  if (voucherId) {
    const { data: voucher, error } = await db.from("vouchers").select("*").eq("id", voucherId).maybeSingle();
    if (error || !voucher) return privateJson({ error: "Voucher not found." }, 400);
    const result = applyQuickOrderVoucher({ voucher, products, lines: priced.lines, subtotal: priced.subtotal, shippingFee, now: new Date() });
    if (!result.ok) return privateJson({ error: result.reason }, 400);
    voucherDiscount = result.totals.voucherDiscount;
    shippingDiscount = result.totals.shippingDiscount;
    voucherCode = voucher.code;
    voucherSnapshot = [{
      voucher_id: voucher.id,
      voucher_code: voucher.code,
      voucher_name: voucher.name,
      reward_type: voucher.reward_type,
      scope_type: voucher.scope_type,
      benefit: { reward_type: voucher.reward_type, amount_off: voucher.amount_off, percent_off: voucher.percent_off, max_discount_amount: voucher.max_discount_amount, gift_product_id: voucher.gift_product_id, gift_variant_id: voucher.gift_variant_id, gift_quantity: voucher.gift_quantity, free_shipping: voucher.reward_type === "free_shipping" },
      rule: { min_order_amount: voucher.min_order_amount, min_item_quantity: voucher.min_item_quantity, applies_to_product_ids: voucher.applies_to_product_ids, applies_to_category_slugs: voucher.applies_to_category_slugs, excluded_product_ids: voucher.excluded_product_ids, applies_to_shipping_methods: voucher.applies_to_shipping_methods, stackable: voucher.stackable, usage_limit_total: voucher.usage_limit_total, usage_limit_per_user: voucher.usage_limit_per_user, start_at: voucher.start_at, end_at: voucher.end_at },
    }] as unknown as Json;
  }
  const total = Math.max(0, priced.subtotal + shippingFee - voucherDiscount - shippingDiscount);
  if (total > QUICK_ORDER_MAX_VND) return privateJson({ error: "Order total exceeds the allowed limit." }, 400);
  const orderId = crypto.randomUUID();
  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${randomBase36(4)}`;
  const deliveryAddress = { full_name: customer.name, phone_number: customer.phone, street_address: customer.address } as unknown as Json;
  const rpcItems = priced.lines.map((line) => ({ product_id: line.product_id, variant_id: line.variant_id, product_name: line.product_name, unit_price: line.unit_price, thumbnail: line.thumbnail, quantity: line.quantity, is_pre_order: line.is_pre_order, pre_order_config: line.pre_order_config }));
  const rpc = db.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  const { data, error } = await rpc("admin_create_quick_order", {
    p_order_id: orderId,
    p_order_number: orderNumber,
    p_total_price: total,
    p_shipping_fee: shippingFee,
    p_delivery_address: deliveryAddress,
    p_shipping_method_id: shippingMethodId,
    p_voucher_id: voucherId,
    p_voucher_code: voucherCode,
    p_voucher_discount: voucherDiscount,
    p_shipping_discount: shippingDiscount,
    p_voucher_snapshot: voucherSnapshot,
    p_payment_type: payment.paymentType,
    p_deposit_percentage: payment.depositPercentage,
    p_deposit_amount: payment.depositAmount,
    p_remaining_amount: payment.remainingAmount,
    p_mark_paid_now: (paymentInput as Record<string, unknown>).mark_paid_now,
    p_items: rpcItems as unknown as Json,
  });
  if (error) {
    console.error("[quick-order] create failed:", error.message);
    return privateJson({ error: "Order could not be created. Product stock or voucher availability may have changed; refresh and retry." }, 409);
  }
  let invoiceUrl: string | null = null;
  try {
    const invoiceItems = priced.lines.map((line) => ({
      name: line.product_name,
      quantity: line.quantity,
      unit_cost: line.unit_price,
      components: [],
    }));
    const markPaidNow = (paymentInput as Record<string, unknown>).mark_paid_now === true;
    const paidAmount = markPaidNow
      ? payment.paymentType === "deposit_cod"
        ? payment.depositAmount
        : total
      : 0;
    invoiceUrl = await generateAndStoreInvoice(orderId, {
      orderNumber,
      customerName: [customer.name, customer.phone].filter(Boolean).join(" · "),
      customerAddress: customer.address,
      items: invoiceItems,
      shippingFee,
      discount: voucherDiscount + shippingDiscount,
      total,
      paymentType: payment.paymentType,
      depositPercentage: payment.depositPercentage ?? undefined,
      depositAmount: payment.depositAmount || undefined,
      balanceDue: Math.max(0, total - paidAmount),
      codAmount: payment.remainingAmount || undefined,
      paidAmount,
    });
    if (!invoiceUrl) console.warn("[quick-order] invoice generation did not return a URL", orderId);
  } catch (invoiceError) {
    console.error("[quick-order] invoice generation failed:", invoiceError);
  }
  try {
    await invalidateProductCaches();
  } catch (error) {
    console.error("[quick-order] product cache invalidation failed", error);
  }
  return privateJson({ ...((data ?? {}) as Record<string, unknown>), total_price: total, invoice_url: invoiceUrl }, 201);
}
