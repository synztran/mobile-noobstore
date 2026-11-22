import { NextRequest, NextResponse } from "next/server";
import { getApiLimiter, getRateLimitKey } from "@/lib/redis/ratelimit";
export const dynamic = "force-dynamic";

// Reports are attacker-controlled telemetry, never trusted evidence. Store no
// URLs, script samples, cookies, account details, or other browser-supplied PII.
export async function POST(req: NextRequest) {
  try {
    const limited = await getApiLimiter().limit(`csp:${getRateLimitKey(req)}`);
    if (!limited.success) return new NextResponse(null, { status: 429 });
    if (!req.body) return new NextResponse(null, { status: 400 });
    const reader = req.body.getReader();
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) { await reader.cancel(); return new NextResponse(null, { status: 413 }); }
      chunks.push(value);
    }
    const report = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const body = report["csp-report"] ?? report;
    const directive = body["effective-directive"] ?? body.effectiveDirective;
    if (typeof directive === "string") {
      const safeDirective = /^[A-Za-z0-9-]{1,64}$/.test(directive)
        ? directive
        : "unknown";
      console.info("[csp-report] violation", { directive: safeDirective });
    }
    return new NextResponse(null, { status: 204 });
  } catch { return new NextResponse(null, { status: 400 }); }
}
