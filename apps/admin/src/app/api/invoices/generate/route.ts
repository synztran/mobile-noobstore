import { NextRequest, NextResponse } from "next/server";
import { buildCustomerAddress } from "@/lib/order-address";
import { getAdminClient } from "@/lib/supabase/admin";
import { generateAndStoreInvoice } from "@/lib/invoice";
import { IOrderDetailUser } from "@/components/orders/OrderDetailModal";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, customer, gifts } = body as {
      orderId?: string;
      customer: IOrderDetailUser;
      gifts: any;
    };

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // Fetch order with items
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Fetch order items with kit components
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select(
        "product_name, quantity, unit_price, order_item_components(component_group, variant_name)"
      )
      .eq("order_id", orderId);

    if (itemsError) {
      return NextResponse.json(
        { error: "Failed to fetch items" },
        { status: 500 }
      );
    }

    // Fetch order services if any
    const { data: services } = await supabase
      .from("order_services")
      .select("service_name, price")
      .eq("order_id", orderId);

    // Build invoice items
    const invoiceItems = (items ?? []).map((item) => ({
      name: item.product_name,
      quantity: item.quantity,
      unit_cost: Number(item.unit_price),
      components: (item.order_item_components ?? []).map(
        (c: { component_group: string; variant_name: string }) => ({
          component_group: c.component_group,
          variant_name: c.variant_name,
        })
      ),
    }));

    // Add services as items
    if (services?.length) {
      services.forEach((s) => {
        invoiceItems.push({
          name: `Dịch vụ: ${s.service_name}`,
          quantity: 1,
          unit_cost: Number(s.price),
          components: [],
        });
      });
    }

    // Combine with gift items
    const allItems = [
      ...invoiceItems,
      ...(Array.isArray(gifts) ? gifts.flat() : []),
    ];

    // Parse delivery address
    const customerAddress = buildCustomerAddress(
      order.delivery_address,
      order.shipping_method_id
    );

    // Get customer name
    const customerName = `${customer?.first_name} ${customer.last_name}`;

    const invoiceUrl = await generateAndStoreInvoice(orderId, {
      orderNumber: order.order_number,
      customerName,
      customerAddress,
      items: allItems,
      shippingFee: Number(order.shipping_fee),
      discount: Number(order.voucher_discount_amount || 0),
      total: Number(order.total_price),
    });

    if (!invoiceUrl) {
      return NextResponse.json(
        { error: "Failed to generate invoice" },
        { status: 500 }
      );
    }

    return NextResponse.json({ invoiceUrl });
  } catch (err) {
    console.error("[generate-invoice] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
