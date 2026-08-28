import { getAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export interface AuditEvent {
  action: string;
  entity_type: string;
  entity_id?: string | null;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
}

/**
 * Log an admin action to admin_audit_log.
 * The acting admin's identity is read from the request's auth cookies via the
 * SSR client (the service-role client has no session, so calling getUser() on
 * it always returns null).
 * Pass supabase if you already have an admin client (otherwise creates one
 * internally) — the insert itself uses the admin client so the audit table is
 * writable regardless of RLS.
 */
export async function logAuditEvent(
  event: AuditEvent,
  supabase?: ReturnType<typeof getAdminClient>,
): Promise<void> {
  try {
    const client = supabase ?? getAdminClient();

    const ssr = await createServerClient();
    const {
      data: { user },
    } = await ssr.auth.getUser();

    if (!user?.email) {
      console.error(
        "[audit-log] No authenticated user on request; event not logged:",
        event.action,
      );
      return;
    }

    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headersList.get("x-real-ip") ??
      null;

    const diff_data = computeDiff(event.old_data, event.new_data);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client.from as any)("admin_audit_log").insert({
      admin_user_id: user.id,
      admin_email: user.email,
      action: event.action,
      entity_type: event.entity_type,
      entity_id: event.entity_id ?? null,
      old_data: event.old_data ?? null,
      new_data: event.new_data ?? null,
      diff_data,
      ip_address: ipAddress,
    });
  } catch (err) {
    console.error("[audit-log] Failed to log event:", err);
  }
}

function computeDiff(
  oldData?: Record<string, unknown> | null,
  newData?: Record<string, unknown> | null,
): Record<string, { old: unknown; new: unknown }> | null {
  if (!oldData || !newData) return null;

  const diff: Record<string, { old: unknown; new: unknown }> = {};
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

  for (const key of allKeys) {
    const oldVal = oldData[key];
    const newVal = newData[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diff[key] = { old: oldVal, new: newVal };
    }
  }

  return Object.keys(diff).length > 0 ? diff : null;
}