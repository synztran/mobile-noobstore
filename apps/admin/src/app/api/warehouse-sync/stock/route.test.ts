import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), role: vi.fn(), rpc: vi.fn(), invalidate: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getAdminClient: () => ({
  auth: { getUser: mocks.getUser }, rpc: mocks.rpc,
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.role }) }) }),
}) }));
vi.mock("@/lib/redis/cache", () => ({ invalidateProductCaches: mocks.invalidate }));
import { POST } from "./route";

const payload = { productId: "940e243b-5141-4a6d-8d6f-b3975388745b", variantId: "existing-variant", expected: 1, delta: -1, reason: "Physical count" };
function request(body: unknown = payload, token = "test-token") {
  return new NextRequest("http://localhost/api/warehouse-sync/stock", { method: "POST", headers: token ? { authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body) });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "admin-id" } }, error: null });
  mocks.role.mockResolvedValue({ data: { role: "admin" } });
  mocks.rpc.mockResolvedValue({ data: { stock_quantity: 0 }, error: null });
});
describe("existing variant stock correction", () => {
  it("requires authentication", async () => {
    expect((await POST(request(payload, ""))).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects non-admins", async () => {
    mocks.role.mockResolvedValue({ data: { role: "customer" } });
    expect((await POST(request())).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each([{ delta: -2 }, { expected: -1 }, { reason: " " }, { delta: "-1" }, { variantId: null }])("rejects invalid fields %j", async (patch) => {
    expect((await POST(request({ ...payload, ...patch }))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("passes verified actor, expected stock and linkage to atomic RPC", async () => {
    const response = await POST(request({ ...payload, actorId: "forged" }));
    expect(await response.json()).toEqual({ stock_quantity: 0 });
    expect(mocks.rpc).toHaveBeenCalledWith("warehouse_adjust_variant_stock", {
      p_warehouse_product_id: payload.productId, p_variant_id: payload.variantId,
      p_expected: 1, p_delta: -1, p_reason: payload.reason, p_actor_id: "admin-id",
    });
    expect(mocks.invalidate).toHaveBeenCalledOnce();
  });
  it("rejects stale or unlinked variants without cache invalidation", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "Stock changed" } });
    expect((await POST(request())).status).toBe(409);
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
  it("does not report mutation failure after cache failure", async () => {
    mocks.invalidate.mockRejectedValue(new Error("Redis offline"));
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect((await response.json()).warning).toContain("Do not repeat");
  });
});
