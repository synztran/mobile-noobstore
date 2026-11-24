import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getAdminClient: () => ({ rpc: mocks.rpc, from: () => ({ select: mocks.select, eq: mocks.eq, maybeSingle: mocks.maybeSingle }) }) }));

import { PUT } from "./route";

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/auctions/test-id", {
    method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
}
const params = { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000001" }) };

beforeEach(() => {
  mocks.rpc.mockReset().mockResolvedValue({ data: { id: "auction" }, error: null });
  mocks.select.mockReset().mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReset().mockReturnValue({ maybeSingle: mocks.maybeSingle });
  mocks.maybeSingle.mockReset().mockResolvedValue({ data: { starts_at: "2026-11-24T10:00:00.000Z", ends_at: "2026-11-25T10:00:00.000Z" }, error: null });
});

describe("PUT /api/auctions/[id]", () => {
  it("forwards BIN and eligibility edits through the atomic RPC", async () => {
    const response = await PUT(request({ bin_price: 200, required_customer_level: 2 }), params);
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("admin_update_auction", expect.objectContaining({
      p_check_price_lock: false,
      p_updates: expect.objectContaining({ bin_price: 200, required_customer_level: 2 }),
    }));
  });

  it("passes starting-price and increment edits to locked RPC validation", async () => {
    await PUT(request({ starting_price: 100, increment_type: "fixed", increment_value: 5 }), params);
    expect(mocks.rpc).toHaveBeenCalledWith("admin_update_auction", expect.objectContaining({ p_check_price_lock: true }));
  });

  it("returns stable conflict for a forbidden pricing edit", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "auction_price_edit_forbidden" } });
    const response = await PUT(request({ starting_price: 100 }), params);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "AUCTION_PRICE_EDIT_FORBIDDEN" });
  });

  it("rejects invalid values before calling the database", async () => {
    expect((await PUT(request({ bin_price: "nope" }), params)).status).toBe(400);
    expect((await PUT(request({ required_order_count: -1 }), params)).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("does not accept current_price from the request", async () => {
    const response = await PUT(request({ current_price: 999 }), params);
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("forwards editable schedule and settlement fields", async () => {
    const response = await PUT(request({
      starts_at: "2026-11-24T10:00:00.000Z", ends_at: "2026-11-25T10:00:00.000Z",
      anti_snipe_minutes: 0, winner_checkout_hours: 12, max_winner_cascades: 2,
      status: "draft", is_featured: false,
    }), params);
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("admin_update_auction", expect.objectContaining({
      p_updates: expect.objectContaining({
        starts_at: "2026-11-24T10:00:00.000Z", ends_at: "2026-11-25T10:00:00.000Z",
        anti_snipe_minutes: 0, winner_checkout_hours: 12, max_winner_cascades: 2,
        status: "draft", is_featured: false,
      }),
    }));
  });

  it("rejects invalid schedule, status, ranges, and non-boolean flags", async () => {
    expect((await PUT(request({ starts_at: "2026-11-25T10:00:00Z", ends_at: "2026-11-24T10:00:00Z" }), params)).status).toBe(400);
    expect((await PUT(request({ status: "made-up" }), params)).status).toBe(400);
    expect((await PUT(request({ winner_checkout_hours: 0 }), params)).status).toBe(400);
    expect((await PUT(request({ is_featured: "false" }), params)).status).toBe(400);
    expect((await PUT(request({ limit_bids_per_user: "false" }), params)).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
