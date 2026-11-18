import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), origin: vi.fn(), body: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/security/admin", () => ({ requireWarehouseAdmin: mocks.auth }));
vi.mock("@/lib/warehouse/guards", () => ({
  isSameOriginMutation: mocks.origin, readJsonBody: mocks.body,
  jsonError: (error: string, status: number) => Response.json({ error }, { status }),
}));
import { POST } from "./route";
const context = { params: Promise.resolve({ id: "warehouse-id" }) };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("ADMIN_APP_ORIGIN", "http://localhost:3001");
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.auth.mockResolvedValue({ ok: true, client: { auth: { getSession: async () => ({ data: { session: { access_token: "verified-session" } } }) } } });
  mocks.origin.mockReturnValue(true);
  mocks.body.mockResolvedValue({ productId: "forged", variantId: "variant", expected: 1, delta: -1, reason: "Count" });
  mocks.fetch.mockResolvedValue(Response.json({ stock_quantity: 0 }));
});
describe("warehouse live stock proxy", () => {
  it("rejects unauthenticated requests", async () => {
    mocks.auth.mockResolvedValue({ ok: false, status: 401 });
    expect((await POST(new NextRequest("http://localhost"), context)).status).toBe(401);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("rejects cross-origin requests", async () => {
    mocks.origin.mockReturnValue(false);
    expect((await POST(new NextRequest("http://localhost"), context)).status).toBe(403);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("requires configured Admin origin", async () => {
    vi.stubEnv("ADMIN_APP_ORIGIN", "");
    expect((await POST(new NextRequest("http://localhost"), context)).status).toBe(503);
  });
  it("uses route ID and verified session rather than caller product ID", async () => {
    expect((await POST(new NextRequest("http://localhost"), context)).status).toBe(200);
    const [url, options] = mocks.fetch.mock.calls[0];
    expect(String(url)).toBe("http://localhost:3001/api/warehouse-sync/stock");
    expect(JSON.parse(options.body).productId).toBe("warehouse-id");
    expect(options.headers.Authorization).toBe("Bearer verified-session");
    expect(options.redirect).toBe("error");
  });
  it("warns about ambiguous transport failure", async () => {
    mocks.fetch.mockRejectedValue(new Error("timeout"));
    const response = await POST(new NextRequest("http://localhost"), context);
    expect(response.status).toBe(502);
    expect((await response.json()).error).toContain("Refresh live stock");
  });
});
