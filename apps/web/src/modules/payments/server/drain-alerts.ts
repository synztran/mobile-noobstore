import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendPaymentSecurityAlert } from "@/lib/telegram/telegram.service";

export async function drainPaymentSecurityAlerts() {
  const db = getAdminClient();
  const { data, error } = await (db.from as any)("payment_security_alerts").select("id, kind, occurrences")
    .is("delivered_at", null).neq("kind", "csp_report").or("kind.in.(recipient_mismatch,bank_config_changed),occurrences.gte.5").order("created_at").limit(20);
  if (error) { console.error("[payment-security] alert queue unavailable"); return; }
  for (const item of data ?? []) {
    // CSP buckets remain retained but paused: expected inline-script reports
    // must not produce attack warnings. Rejections still require five events.
    if (item.kind === "csp_report") continue;
    if (item.kind === "payment_rejected" && item.occurrences < 5) continue;
    try {
      await sendPaymentSecurityAlert(item.kind, item.occurrences);
      await (db.from as any)("payment_security_alerts").update({ delivered_at: new Date().toISOString() }).eq("id", item.id);
    } catch { console.error("[payment-security] Telegram unavailable; queued for retry"); }
  }
}
