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

    // An unavailable health endpoint is a monitor failure, not a classified
    // service state. Avoid cascading retries if Better Stack is also failing.
    if (!healthRes.ok) {
      return NextResponse.json({ status: "error" }, { status: 502 });
    }

    const data = await healthRes.json();
    const status: string =
      data?.status === "healthy" ||
      data?.status === "degraded" ||
      data?.status === "error"
        ? data.status
        : "error";

    if (status === "healthy") {
      // Resolve any open incident for this source
      const id = await bsFindBySource(HEALTH_SOURCE);
      const result = id ? await bsResolve(id) : { data: { id: undefined } };
      return NextResponse.json({ status: "healthy", incident: result });
    }

    // Degraded/error — publish customer-safe incident copy only.
    const existing = await bsFindBySource(HEALTH_SOURCE);
    // Reuse an open incident so each five-minute probe does not create another.
    const result = existing
      ? { data: { id: existing } }
      : await bsTrigger({
          summary: "NoobStore đang gặp gián đoạn dịch vụ",
          cause:
            "Một số dịch vụ có thể hoạt động không ổn định. Đội ngũ NoobStore đang kiểm tra và sẽ cập nhật tại trang trạng thái.",
          metadata: {
            Source: { value: HEALTH_SOURCE },
            Status: { value: status },
          },
          channels: HEALTH_PAGE_CHANNELS,
        });

    return NextResponse.json({ status, incident: result });
  } catch (err) {
    console.error(
      "[health-check] failed",
      err instanceof Error ? err.name : "UnknownError",
    );
    return NextResponse.json({ status: "error" }, { status: 502 });
  }
}
