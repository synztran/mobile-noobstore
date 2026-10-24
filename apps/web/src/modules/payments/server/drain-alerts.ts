import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendPaymentSecurityAlert } from "@/lib/telegram/telegram.service";

export async function drainPaymentSecurityAlerts() {
  const db = getAdminClient();
  const { data, error } = await (db.from as any)("payment_security_alerts").select("id, kind, occurrences")
    .is("delivered_at", null).or("kind.in.(recipient_mismatch,bank_config_changed),occurrences.gte.5").order("created_at").limit(20);
  if (error) { console.error("[payment-security] alert queue unavailable"); return; }
  for (const item of data ?? []) {
    // Repeated rejected actions/report noise trigger alerts; single recipient or
    // configuration changes are important enough to notify immediately.
    if (["payment_rejected", "csp_report"].includes(item.kind) && item.occurrences < 5) continue;
    try {
      await sendPaymentSecurityAlert(item.kind, item.occurrences);
      await (db.from as any)("payment_security_alerts").update({ delivered_at: new Date().toISOString() }).eq("id", item.id);
    } catch { console.error("[payment-security] Telegram unavailable; queued for retry"); }
  }
}
