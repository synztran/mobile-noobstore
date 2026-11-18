import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { invalidateProductCaches } from "@/lib/redis/cache";

export const dynamic = "force-dynamic";

interface InboundBatchItem {
  product_id: string;
  product_slug: string;
  product_name: string;
  variant_id: string | null;
  variant_name: string | null;
  current_stock: number;
  inbound_quantity: number;
}

interface InboundOperationPayload {
  type: string;
  filename: string;
  note?: string | null;
  created_at: string;
  created_by_email?: string;
  item_count: number;
  total_quantity: number;
  items: InboundBatchItem[];
}

export async function GET() {
  try {
    const supabase = getAdminClient();

    // Query pending and recent inbound batches from warehouse_sync_operations
    const { data: operations, error } = await (supabase.from as any)(
      "warehouse_sync_operations"
    )
      .select(
        "operation_id, request_payload, response_payload, created_at, completed_at, actor_id"
      )
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      return NextResponse.json(
        { error: "Failed to load inbound batches" },
        { status: 500 }
      );
    }

    const inboundBatches = (operations ?? [])
      .filter((op: any) => op.request_payload?.type === "inbound_batch")
      .map((op: any) => {
        const payload = op.request_payload as InboundOperationPayload;
        return {
          operation_id: op.operation_id,
          filename: payload?.filename ?? "inbound.csv",
          note: payload?.note ?? null,
          item_count: payload?.item_count ?? (payload?.items?.length || 0),
          total_quantity: payload?.total_quantity ?? 0,
          created_at: op.created_at,
          created_by: payload?.created_by_email ?? "warehouse",
          completed_at: op.completed_at,
          status: op.completed_at ? "applied" : "pending_approval",
          items: payload?.items ?? [],
        };
      });

    return NextResponse.json({ batches: inboundBatches });
  } catch (err) {
    console.error("[inbound-api] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { operation_id } = body as { operation_id?: string };

    if (!operation_id) {
      return NextResponse.json(
        { error: "operation_id is required" },
        { status: 400 }
      );
    }

    const authClient = await createServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getAdminClient();

    // 1. Fetch the operation
    const { data: op, error: opError } = await (supabase.from as any)(
      "warehouse_sync_operations"
    )
      .select("*")
      .eq("operation_id", operation_id)
      .single();

    if (opError || !op) {
      return NextResponse.json(
        { error: "Inbound batch not found" },
        { status: 404 }
      );
    }

    // 2. Guard against double-apply
    if (op.completed_at) {
      return NextResponse.json(
        { error: "Lô hàng này đã được áp dụng vào tồn kho trước đó." },
        { status: 409 }
      );
    }

    const payload = op.request_payload as InboundOperationPayload;
    if (payload?.type !== "inbound_batch" || !Array.isArray(payload?.items)) {
      return NextResponse.json(
        { error: "Dữ liệu lô hàng không hợp lệ." },
        { status: 400 }
      );
    }

    const items = payload.items;
    const appliedDiffs: Array<{
      product_name: string;
      variant_name: string | null;
      old_stock: number;
      inbound_quantity: number;
      new_stock: number;
    }> = [];

    // 3. Atomically apply stock updates
    for (const item of items) {
      const qtyToAdd = Number(item.inbound_quantity ?? 0);
      if (qtyToAdd <= 0) continue;

      if (item.variant_id) {
        // Variant stock update
        const { data: vRow, error: vReadError } = await supabase
          .from("product_variants")
          .select("id, stock_quantity")
          .eq("id", item.variant_id)
          .single();

        if (vReadError || !vRow) {
          console.error(
            `[inbound-apply] Variant ${item.variant_id} not found:`,
            vReadError
          );
          continue;
        }

        const currentStock = Number(vRow.stock_quantity ?? 0);
        const nextStock = currentStock + qtyToAdd;

        const { error: vUpdateError } = await supabase
          .from("product_variants")
          .update({
            stock_quantity: nextStock,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.variant_id);

        if (vUpdateError) {
          console.error(
            `[inbound-apply] Failed to update variant ${item.variant_id}:`,
            vUpdateError
          );
          continue;
        }

        appliedDiffs.push({
          product_name: item.product_name,
          variant_name: item.variant_name,
          old_stock: currentStock,
          inbound_quantity: qtyToAdd,
          new_stock: nextStock,
        });
      } else if (item.product_id) {
        // Non-variant product stock update
        const { data: pRow, error: pReadError } = await supabase
          .from("products")
          .select("id, stock_quantity")
          .eq("id", item.product_id)
          .single();

        if (pReadError || !pRow) {
          console.error(
            `[inbound-apply] Product ${item.product_id} not found:`,
            pReadError
          );
          continue;
        }

        const currentStock = Number(pRow.stock_quantity ?? 0);
        const nextStock = currentStock + qtyToAdd;

        const { error: pUpdateError } = await supabase
          .from("products")
          .update({
            stock_quantity: nextStock,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.product_id);

        if (pUpdateError) {
          console.error(
            `[inbound-apply] Failed to update product ${item.product_id}:`,
            pUpdateError
          );
          continue;
        }

        appliedDiffs.push({
          product_name: item.product_name,
          variant_name: null,
          old_stock: currentStock,
          inbound_quantity: qtyToAdd,
          new_stock: nextStock,
        });
      }
    }

    // 4. Invalidate storefront caches
    await invalidateProductCaches();

    const nowIso = new Date().toISOString();

    // 5. Mark operation as completed
    await (supabase.from as any)("warehouse_sync_operations")
      .update({
        completed_at: nowIso,
        response_payload: {
          applied_by_email: user.email,
          applied_by_id: user.id,
          applied_at: nowIso,
          updated_items_count: appliedDiffs.length,
          total_items: items.length,
        },
      })
      .eq("operation_id", operation_id);

    // 6. Write admin audit log
    await supabase.from("admin_audit_log").insert({
      admin_user_id: user.id,
      admin_email: user.email ?? "admin",
      action: "inventory.inbound_applied",
      entity_type: "warehouse_sync_operations",
      entity_id: operation_id,
      diff_data: {
        filename: payload.filename,
        note: payload.note,
        updated_count: appliedDiffs.length,
        items: appliedDiffs,
      } as any,
    });

    return NextResponse.json({
      success: true,
      updated_items_count: appliedDiffs.length,
      message: `Đã áp dụng thành công ${appliedDiffs.length} mặt hàng vào tồn kho.`,
    });
  } catch (err) {
    console.error("[inbound-api] POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
