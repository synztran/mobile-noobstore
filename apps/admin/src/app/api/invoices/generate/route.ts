import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  buildInvoiceInput,
  fetchInvoiceItems,
  generateAndStoreInvoice,
  type InvoiceItem,
  type InvoiceOrderRow,
} from "@/lib/invoice";
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

    // order_items + order_services, then gift lines from the request body on top
    const invoiceItems: InvoiceItem[] = await fetchInvoiceItems(orderId);
    if (Array.isArray(gifts)) {
      invoiceItems.push(...(gifts.flat() as InvoiceItem[]));
    }

    // Get customer name
    const customerName = `${customer?.first_name} ${customer.last_name}`;

    // Settled orders zero the header "Cần thanh toán"; the "Còn lại (COD)" row
    // keeps the original COD amount via codAmount.
    const settled = order.status === "delivered";

    const invoiceUrl = await generateAndStoreInvoice(
      orderId,
      buildInvoiceInput(order as InvoiceOrderRow, {
        customerName,
        items: invoiceItems,
        settled,
      }),
      settled ? { force: true } : undefined
    );

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
