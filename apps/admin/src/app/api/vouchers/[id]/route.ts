import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await req.json();
  const supabase = getAdminClient();

  const sanitized: any = {};

  if (Object.prototype.hasOwnProperty.call(body, "name")) {
    sanitized.name = body.name;
  }
  if (Object.prototype.hasOwnProperty.call(body, "code")) {
    sanitized.code = body.code;
  }
  if (Object.prototype.hasOwnProperty.call(body, "description")) {
    sanitized.description = body.description;
  }
  if (Object.prototype.hasOwnProperty.call(body, "reward_type")) {
    sanitized.reward_type = body.reward_type;
  }
  if (Object.prototype.hasOwnProperty.call(body, "scope_type")) {
    sanitized.scope_type = body.scope_type;
  }
  if (Object.prototype.hasOwnProperty.call(body, "amount_off")) {
    sanitized.amount_off = body.amount_off;
  }
  if (Object.prototype.hasOwnProperty.call(body, "percent_off")) {
    sanitized.percent_off = body.percent_off;
  }
  if (Object.prototype.hasOwnProperty.call(body, "usage_limit_total")) {
    sanitized.usage_limit_total = body.usage_limit_total;
  }
  if (Object.prototype.hasOwnProperty.call(body, "usage_limit_per_user")) {
    sanitized.usage_limit_per_user = body.usage_limit_per_user;
  }
  if (Object.prototype.hasOwnProperty.call(body, "status")) {
    sanitized.status = body.status;
  }
  if (Object.prototype.hasOwnProperty.call(body, "min_order_amount")) {
    sanitized.min_order_amount = body.min_order_amount;
  }
  if (Object.prototype.hasOwnProperty.call(body, "start_at")) {
    sanitized.start_at = body.start_at;
  }
  if (Object.prototype.hasOwnProperty.call(body, "end_at")) {
    sanitized.end_at = body.end_at;
  }
  if (Object.prototype.hasOwnProperty.call(body, "stackable")) {
    sanitized.stackable = body.stackable;
  }
  if (Object.prototype.hasOwnProperty.call(body, "applies_to_product_ids")) {
    sanitized.applies_to_product_ids = body.applies_to_product_ids;
  }
  if (Object.prototype.hasOwnProperty.call(body, "applies_to_category_slugs")) {
    sanitized.applies_to_category_slugs = body.applies_to_category_slugs;
  }
  if (Object.prototype.hasOwnProperty.call(body, "excluded_product_ids")) {
    sanitized.excluded_product_ids = body.excluded_product_ids;
  }
  if (Object.prototype.hasOwnProperty.call(body, "applies_to_shipping_methods")) {
    sanitized.applies_to_shipping_methods = body.applies_to_shipping_methods;
  }
  if (Object.prototype.hasOwnProperty.call(body, "customer_ids")) {
    sanitized.customer_ids = body.customer_ids;
  }

  if (Object.keys(sanitized).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("vouchers")
    .update(sanitized)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
