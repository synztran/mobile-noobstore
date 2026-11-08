import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), clearCart: vi.fn(), getActiveCartId: vi.fn(), getCartItems: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/modules/cart/server/reminders", () => ({
  sendStaleCartReminder: vi.fn(),
}));
vi.mock("@/modules/cart/server/service", () => ({
  clearCart: mocks.clearCart,
  getActiveCartId: mocks.getActiveCartId,
  getCartItems: mocks.getCartItems,
}));

import { DELETE, GET } from "./route";

describe("GET /api/cart", () => {
  beforeEach(() => mocks.createClient.mockReset());

  it("returns an empty guest cart without initializing Supabase Auth", async () => {
    const response = await GET(
      new NextRequest("https://www.noobstore.xyz/api/cart")
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ cart_id: null, items: [] });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("continues through Supabase for a usable session cookie", async () => {
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: async () => ({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
    });
    const response = await GET(
      new NextRequest("https://www.noobstore.xyz/api/cart", {
        headers: {
          cookie:
            "sb-project-auth-token=base64-eyJhY2Nlc3NfdG9rZW4iOiJ0b2tlbiIsInJlZnJlc2hfdG9rZW4iOiJyZWZyZXNoIiwiZXhwaXJlc19hdCI6OTk5OTk5OTk5OX0",
        },
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.createClient).toHaveBeenCalledOnce();
  });
});

describe("DELETE /api/cart", () => {
  beforeEach(() => mocks.clearCart.mockReset());

  it("rejects unauthenticated deletes", async () => {
    mocks.createClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    const response = await DELETE(new NextRequest("https://shop.test/api/cart?cart_id=c1"));
    expect(response.status).toBe(401);
    expect(mocks.clearCart).not.toHaveBeenCalled();
  });

  it("does not clear another user's cart", async () => {
    mocks.createClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
      from: (table: string) => ({
        select: () => {
          const filters = { eq: () => filters };
          return table === "carts"
            ? { eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }
            : { eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) };
        },
      }),
    });
    const response = await DELETE(new NextRequest("https://shop.test/api/cart?cart_id=foreign"));
    expect(response.status).toBe(404);
    expect(mocks.clearCart).not.toHaveBeenCalled();
  });
});
