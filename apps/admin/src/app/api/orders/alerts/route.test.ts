import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), role: vi.fn(), from: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mocks.auth },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.role }) }) }),
}) }));
vi.mock("@/lib/supabase/admin", () => ({ getAdminClient: () => ({ from: mocks.from }) }));
import { GET } from "./route";

const cursor = { createdAt: "2026-10-23T10:00:00.123456+00:00", id: "7dd9c07a-9d48-4270-bfd5-ec66b9fc4483" };
const order = { id: cursor.id, created_at: cursor.createdAt, order_number: "ORD-1", total_price: 50000 };

describe("admin order alerts endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ data: { user: { id: "admin" } } });
    mocks.role.mockResolvedValue({ data: { role: "admin" } });
  });
  it("requires authentication before accessing orders", async () => {
    mocks.auth.mockResolvedValue({ data: { user: null } });
    expect((await GET(new NextRequest("http://localhost/api/orders/alerts"))).status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("requires the database admin role", async () => {
    mocks.role.mockResolvedValue({ data: { role: "customer" } });
    expect((await GET(new NextRequest("http://localhost/api/orders/alerts"))).status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("rejects malformed cursors before querying", async () => {
    expect((await GET(new NextRequest("http://localhost/api/orders/alerts?cursor=bad"))).status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  function queryResult(error: unknown = null) {
    const query = {
      select: vi.fn().mockReturnThis(), or: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [order], error }),
    };
    mocks.from.mockReturnValue(query);
    return query;
  }
  it("establishes a silent baseline without returning existing orders", async () => {
    const query = queryResult();
    const response = await GET(new NextRequest("http://localhost/api/orders/alerts"));
    expect(await response.json()).toEqual({ orders: [], cursor });
    expect(query.limit).toHaveBeenCalledWith(1);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("returns new rows in bounded pages and excludes quick orders", async () => {
    const query = queryResult();
    const response = await GET(new NextRequest(`http://localhost/api/orders/alerts?cursor=${encodeURIComponent(JSON.stringify(cursor))}`));
    expect(await response.json()).toEqual({ orders: [order], cursor });
    expect(query.or).toHaveBeenCalledWith("is_quick_order.is.null,is_quick_order.eq.false");
    expect(query.limit).toHaveBeenCalledWith(100);
  });
  it("does not leak database errors or advance cursor on failure", async () => {
    queryResult({ message: "private database details" });
    const response = await GET(new NextRequest("http://localhost/api/orders/alerts"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Unable to check new orders" });
  });
});
