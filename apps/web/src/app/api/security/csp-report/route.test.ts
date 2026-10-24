import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ limit: vi.fn(), queue: vi.fn() }));
vi.mock("@/lib/redis/ratelimit", () => ({ getApiLimiter: () => ({ limit: mocks.limit }), getRateLimitKey: () => "test-ip" }));
vi.mock("@/modules/payments/server/security-alerts", () => ({ queuePaymentAlert: mocks.queue }));
import { POST } from "./route";

beforeEach(() => { vi.clearAllMocks(); mocks.limit.mockResolvedValue({ success: true }); });
const request = (body: string) => new NextRequest("https://example.com/api/security/csp-report", { method: "POST", body });
describe("legacy CSP reports", () => {
  it("uses isolated quota and never escalates inline-script reports", async () => {
    const result = await POST(request(JSON.stringify({ "csp-report": { "effective-directive": "script-src-elem" } })));
    expect(result.status).toBe(204);
    expect(mocks.limit).toHaveBeenCalledWith("csp:test-ip");
    expect(mocks.queue).not.toHaveBeenCalled();
  });
  it("retains rate and body-size limits", async () => {
    mocks.limit.mockResolvedValueOnce({ success: false });
    expect((await POST(request("{}"))).status).toBe(429);
    expect((await POST(request("x".repeat(16385)))).status).toBe(413);
    expect((await POST(request("invalid json"))).status).toBe(400);
  });
});
