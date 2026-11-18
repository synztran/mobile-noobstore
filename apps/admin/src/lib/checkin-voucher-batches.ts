import { randomBytes } from "node:crypto";

export function generateEventCode() {
  return `EV-${randomBytes(8).toString("hex").toUpperCase()}`;
}

export async function processVoucherBatch(db: any, batchId: string, terms: Record<string, any>) {
  const { data: pending, error: pendingError } = await db.from("checkin_voucher_batch_items").select("id,item_number,attempts")
    .eq("batch_id", batchId).in("status", ["pending", "failed"]).limit(100);
  if (pendingError) throw new Error(pendingError.message);
  for (const item of pending ?? []) {
    const { data: claimed } = await db.from("checkin_voucher_batch_items").update({ status: "processing", attempts: item.attempts + 1, updated_at: new Date().toISOString() })
      .eq("id", item.id).in("status", ["pending", "failed"]).select("id").maybeSingle();
    if (!claimed) continue;
    let voucherId: string | null = null;
    for (let attempt = 0; attempt < 3 && !voucherId; attempt++) {
      try {
      const code = generateEventCode();
      const { data: voucher, error } = await db.from("vouchers").insert({
        code, name: terms.name, description: terms.description ?? null, status: "active", source_type: "event", checkin_batch_id: batchId,
        reward_type: terms.reward_type, scope_type: terms.scope_type ?? "order_total", amount_off: terms.amount_off ?? null,
        percent_off: terms.percent_off ?? null, max_discount_amount: terms.max_discount_amount ?? null,
        min_order_amount: terms.min_order_amount ?? 0, usage_limit_total: 1, usage_limit_per_user: 1,
        stackable: false, start_at: terms.start_at ?? null, end_at: terms.end_at ?? null, metadata: { batch_item_id: item.id },
      }).select("id").single();
      if (error) throw error;
      const { error: updateError } = await db.from("checkin_voucher_batch_items").update({ status: "created", voucher_id: voucher.id, error_message: null, updated_at: new Date().toISOString() }).eq("id", item.id).eq("status", "processing");
      if (updateError) throw updateError;
      voucherId = voucher.id;
      } catch { /* retry with fresh unique code */ }
    }
    if (!voucherId) {
      await db.from("checkin_voucher_batch_items").update({ status: "failed", error_message: "Voucher creation failed; retry available", updated_at: new Date().toISOString() }).eq("id", item.id).eq("status", "processing");
    }
  }
  const { data: rows, error: rowsError } = await db.from("checkin_voucher_batch_items").select("status").eq("batch_id", batchId);
  if (rowsError) throw new Error(rowsError.message);
  const created = (rows ?? []).filter((row: any) => ["created", "assigned"].includes(row.status)).length;
  const failed = (rows ?? []).filter((row: any) => row.status === "failed").length;
  const status = failed ? created ? "partial" : "failed" : created === rows?.length ? "complete" : "processing";
  const { error: updateBatchError } = await db.from("checkin_voucher_batches").update({ created_count: created, failed_count: failed, status, updated_at: new Date().toISOString() }).eq("id", batchId);
  if (updateBatchError) throw new Error(updateBatchError.message);
  return { created, failed, status };
}
