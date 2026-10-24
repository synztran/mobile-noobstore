import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";

/** Durable, bounded alerts; never put raw recipient/account/customer data in messages. */
export async function queuePaymentAlert(kind: string, key: string) {
  try {
    const { error } = await (getAdminClient().rpc as any)("queue_payment_security_alert", { p_kind: kind, p_key: key });
    if (error) console.error("[payment-security] cannot queue alert", kind);
  } catch { console.error("[payment-security] cannot queue alert", kind); }
}
