import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface OrderItemComponentDetail {
  variant_id: string;
  variant_name: string;
  component_group: string;
  price_adjustment: number;
  thumbnail: string | null;
}

export interface OrderItemDetail {
  id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  thumbnail: string | null;
  components: OrderItemComponentDetail[];
  gifts?: Array<{
    gift_name: string;
    gift_thumbnail: string | null;
    quantity: number;
  }> | null;
  isPreOrder: boolean;
  preOrderConfig: any;
}

export interface OrderDetail {
  id: string;
  order_number: string;
  status: "pending" | "confirmed" | "delivering" | "delivered" | "cancelled";
  total_price: number;
  shipping_fee: number;
  payment_type: "full" | "deposit_cod";
  deposit_percentage: number | null;
  deposit_amount: number | null;
  remaining_amount: number | null;
  deposit_paid_at: string | null;
  voucher_code: string | null;
  voucher_discount_amount: number;
  shipping_discount_amount: number;
  voucher_snapshot: unknown | null;
  cancelled_at: string | null;
  cancelled_note: string | null;
  created_at: string | null;
  updated_at: string | null;
  delivery_address: {
    full_name?: string | null;
    phone_number?: string | null;
    street_address?: string | null;
    apartment?: string | null;
    ward?: string | null;
    district?: string | null;
    city?: string | null;
    postal_code?: string | null;
    notes?: string | null;
  } | null;
  invoice_url: string | null;
  items: OrderItemDetail[];
}

interface RawOrderRow {
  id: string;
  order_number: string;
  status: "pending" | "confirmed" | "delivering" | "delivered" | "cancelled";
  total_price: number;
  shipping_fee: number | null;
  payment_type: string;
  deposit_percentage: number | null;
  deposit_amount: number | null;
  remaining_amount: number | null;
  deposit_paid_at: string | null;
  voucher_code: string | null;
  voucher_discount_amount: number | string | null;
  shipping_discount_amount: number | string | null;
  voucher_snapshot: unknown | null;
  cancelled_at: string | null;
  cancelled_note: string | null;
  created_at: string | null;
  updated_at: string | null;
  delivery_address: unknown | null;
  invoice_url: string | null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } = (await supabase
      .from("orders")
      .select(
        "id, order_number, status, total_price, shipping_fee, payment_type, deposit_percentage, deposit_amount, remaining_amount, deposit_paid_at, voucher_code, voucher_discount_amount, shipping_discount_amount, voucher_snapshot, cancelled_at, cancelled_note, created_at, updated_at, delivery_address, invoice_url"
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single()) as unknown as {
      data: RawOrderRow | null;
      error: { message: string } | null;
    };

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const { data: rawItems } = await supabase
      .from("order_items")
      .select("id, product_id, product_name, unit_price, quantity, thumbnail")
      .eq("order_id", id) as unknown as {
      data: Array<Record<string, unknown>> | null;
      error: { message: string } | null;
    };

    const orderItems = (rawItems ?? []) as Array<Record<string, unknown>>;
    const orderItemIds = orderItems.map((row) => row.id as string);

    let rawComponents: Array<{
      order_item_id: string | null;
      product_variant_id: string;
      variant_name: string;
      component_group: string;
      price_adjustment: number | null;
      thumbnail: string | null;
    }> = [];

    if (orderItemIds.length > 0) {
      const { data } = await supabase
        .from("order_item_components")
        .select(
          "order_item_id, product_variant_id, variant_name, component_group, price_adjustment, thumbnail"
        )
        .in("order_item_id", orderItemIds);
      rawComponents = data ?? [];
    }

    const productIds = Array.from(
      new Set(
        orderItems
          .map((row) => row.product_id)
          .filter((value): value is string => Boolean(value))
      )
    );

    let productRows: Array<{ id: string; thumbnail: string | null }> = [];
    if (productIds.length > 0) {
      const { data } = await supabase
        .from("products")
        .select("id, thumbnail")
        .eq("is_active", true)
        .in("id", productIds);
      productRows = data ?? [];
    }

    const productThumbnailById = new Map(
      productRows.map((row) => [row.id, row.thumbnail])
    );

    const giftsByProductId: Record<
      string,
      Array<{
        gift_name: string;
        gift_thumbnail: string | null;
        quantity: number;
      }>
    > = {};
    if (productIds.length > 0) {
      const { data: giftRows } = await supabase
        .from("gift_products")
        .select(
          `product_id, quantity, gift:gift_product_id!inner(name, slug, thumbnail)`
        )
        .in("product_id", productIds);

      if (giftRows) {
        for (const g of giftRows as unknown as Array<Record<string, unknown>>) {
          const pid = g.product_id as string;
          const gift = g.gift as Record<string, unknown>;
          if (!giftsByProductId[pid]) giftsByProductId[pid] = [];
          giftsByProductId[pid].push({
            gift_name: (gift.name as string) ?? "",
            gift_thumbnail: (gift.thumbnail as string) ?? null,
            quantity: Number(g.quantity ?? 1),
          });
        }
      }
    }

    const componentsByOrderItemId = rawComponents.reduce<
      Record<string, OrderItemComponentDetail[]>
    >((acc, comp) => {
      if (!comp.order_item_id) return acc;
      const bucket = acc[comp.order_item_id] ?? [];
      bucket.push({
        variant_id: comp.product_variant_id,
        variant_name: comp.variant_name,
        component_group: comp.component_group,
        price_adjustment: Number(comp.price_adjustment ?? 0),
        thumbnail: comp.thumbnail,
      });
      acc[comp.order_item_id] = bucket;
      return acc;
    }, {});

    const items: OrderItemDetail[] = orderItems.map((row) => {
      const rowId = row.id as string;
      const components = componentsByOrderItemId[rowId] ?? [];
      const componentsTotal = (components as OrderItemComponentDetail[]).reduce(
        (sum: number, comp: OrderItemComponentDetail) => sum + comp.price_adjustment,
        0
      );

      const componentThumbnail = (components as OrderItemComponentDetail[]).find(
        (comp: OrderItemComponentDetail) => comp.thumbnail
      )?.thumbnail;

      return {
        id: row.id as string,
        product_id: (row.product_id as string | null),
        product_name: row.product_name as string,
        unit_price: Number(row.unit_price),
        quantity: row.quantity as number,
        thumbnail:
          (row.thumbnail as string | null) ??
          componentThumbnail ??
          (row.product_id
            ? (productThumbnailById.get(row.product_id as string) ?? null)
            : null),
        components,
        gifts: row.product_id
          ? (giftsByProductId[row.product_id as string] ?? null)
          : null,
        isPreOrder: (row as Record<string, unknown>).is_pre_order as boolean ?? false,
        preOrderConfig: (row as Record<string, unknown>).pre_order_config ?? null,
      };
    });

    return NextResponse.json({
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      total_price: Number(order.total_price),
      shipping_fee: Number(order.shipping_fee ?? 0),
      payment_type: order.payment_type as "full" | "deposit_cod",
      deposit_percentage: order.deposit_percentage,
      deposit_amount: order.deposit_amount,
      remaining_amount: order.remaining_amount,
      deposit_paid_at: order.deposit_paid_at,
      voucher_code: order.voucher_code ?? null,
      voucher_discount_amount: Number(order.voucher_discount_amount ?? 0),
      shipping_discount_amount: Number(order.shipping_discount_amount ?? 0),
      voucher_snapshot: order.voucher_snapshot ?? null,
      cancelled_at: order.cancelled_at ?? null,
      cancelled_note: order.cancelled_note ?? null,
      created_at: order.created_at ?? null,
      updated_at: order.updated_at ?? null,
      delivery_address:
        order.delivery_address as OrderDetail["delivery_address"],
      invoice_url: order.invoice_url ?? null,
      items,
    } satisfies OrderDetail);
  } catch (err) {
    console.error("[order detail] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
