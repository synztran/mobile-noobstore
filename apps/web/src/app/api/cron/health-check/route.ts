import { requireCronSecret } from "@/lib/auth/requireCronSecret";
import { drainPaymentSecurityAlerts } from "@/modules/payments/server/drain-alerts";
import {
  bsTrigger,
  bsResolve,
  bsFindBySource,
  HEALTH_PAGE_CHANNELS,
} from "@/lib/betterstack";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const HEALTH_SOURCE = "noobstore-health-check";

/**
 * Scheduled health check (Vercel Cron: every 5 min).
 * Fetches /api/health internally, then creates/resolves a Better Stack incident.
 */
export async function POST(req: NextRequest) {
  const authError = requireCronSecret(req);
  if (authError) return authError;
  try { await drainPaymentSecurityAlerts(); } catch { console.error("[payment-security] alert drain failed"); }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  try {
    const healthRes = await fetch(`${baseUrl}/api/health`, {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });

    // Unreachable — create (or re-trigger) a critical incident
    if (!healthRes.ok) {
      const existing = await bsFindBySource(HEALTH_SOURCE);
      const result = existing
        ? { data: { id: existing } }
        : await bsTrigger({
            summary: `Health endpoint returned HTTP ${healthRes.status}`,
            cause: `The /api/health endpoint returned HTTP ${healthRes.status}. The API may be unreachable.`,
            metadata: { Source: { value: HEALTH_SOURCE } },
            channels: HEALTH_PAGE_CHANNELS,
          });
      return NextResponse.json({ status: "unreachable", incident: result });
    }

    const data = await healthRes.json();
    const status: string = data.status ?? "unknown";

    if (status === "healthy") {
      // Resolve any open incident for this source
      const id = await bsFindBySource(HEALTH_SOURCE);
      const result = id ? await bsResolve(id) : { data: { id: undefined } };
      return NextResponse.json({ status: "healthy", incident: result });
    }

    // degraded or error — create/update incident
    const failedTables = data.tables
      ? Object.entries(data.tables as Record<string, { ok: boolean; error?: string }>)
          .filter(([, t]) => !t.ok)
          .map(([name, t]) => `${name}: ${t.error ?? "failed"}`)
      : [];

    const existing = await bsFindBySource(HEALTH_SOURCE);
    // If an incident is already open, this update re-triggers the on-call
    const result = existing
      ? { data: { id: existing } }
      : await bsTrigger({
          summary: `Site health: ${status}${failedTables.length > 0 ? ` — ${failedTables.join(", ")}` : ""}`,
          cause: `Health check returned "${status}". ${failedTables.length} table(s) failing.`,
          metadata: {
            Source: { value: HEALTH_SOURCE },
            Status: { value: status },
          },
          channels: HEALTH_PAGE_CHANNELS,
        });

    return NextResponse.json({ status, incident: result });
  } catch (err) {
    const existing = await bsFindBySource(HEALTH_SOURCE);
    const result = existing
      ? { data: { id: existing } }
      : await bsTrigger({
          summary: `Health check failed: ${err instanceof Error ? err.message : "Unknown error"}`,
          metadata: { Source: { value: HEALTH_SOURCE } },
          channels: HEALTH_PAGE_CHANNELS,
        });
    return NextResponse.json({ status: "error", incident: result }, { status: 500 });
  }
}
