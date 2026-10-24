import { getAlertIpLimiter, getAlertLimiter } from "./ratelimit";
import { notifyRateLimitHit } from "@/lib/telegram/telegram.service";

export const isCspReportPath = (pathname: string) => pathname === "/api/security/csp-report";

/** Cross-instance cooldown: one warning per IP/10 minutes, plus global cap. */
export async function fireRateLimitAlert(ip: string, path: string, hasSessionCookie: boolean): Promise<void> {
  try {
    if (!(await getAlertIpLimiter().limit(ip)).success) return;
    if (!(await getAlertLimiter().limit("ratelimit-alert")).success) return;
    await notifyRateLimitHit(ip, path, hasSessionCookie);
  } catch {
    // Best-effort warnings must not interfere with the 429 response.
  }
}
