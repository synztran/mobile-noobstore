
/**
 * Customer notification for order status changes, fired from the admin order
 * routes.
 *
 * Why this lives here rather than inside the two route handlers:
 * `orders/[id]` PATCH and `orders/bulk-status` duplicate their side-effect
 * logic, so a notification added to only one of them silently skips customers
 * whenever staff use the other. Both call this one function.
 *
 * It deliberately does NOT throw and never returns a rejected promise: the
 * order is already saved by the time we get here, and a Resend outage must not
 * surface to the operator as a failed status change.
 */

/** Minimal structural type — the admin supabase client is not generic here. */
type AdminSupabase = {
  from: (table: string) => any;
};

export type NotifyOutcome =
  | { outcome: "skipped"; reason: string }
  | { outcome: "sent" }
  | { outcome: "failed"; error: string };

/**
 * Customer email delivery is paused while a replacement transactional provider
 * is selected. Keep this shared notifier as a no-op so the order API flow can be
 * restored without changing its callers.
 */
export async function notifyOrderStatusEmail(
  supabase: AdminSupabase,
  orderId: string,
  status: string | null | undefined
): Promise<NotifyOutcome> {
  void supabase;
  void orderId;
  void status;
  return { outcome: "skipped", reason: "Email delivery temporarily disabled" };
}
