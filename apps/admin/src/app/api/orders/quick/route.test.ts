import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  user: { id: "admin-1" } as { id: string } | null,
  role: "admin" as string | null,
  rpc: vi.fn(),
  invalidations: vi.fn(),
  invoice: vi.fn(),
  component: false,
  parentsError: false,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: h.user }, error: null }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: h.role ? { role: h.role } : null, error: null }) }) }) }),
  }),
}));

vi.mock("@/lib/redis/cache", () => ({ invalidateProductCaches: h.invalidations }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/invoice", () => ({ generateAndStoreInvoice: h.invoice }));
vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: () => ({
    from(table: string) {
      const builder: Record<string, (...args: never[]) => unknown> = {};
      for (const method of ["select", "eq", "neq", "in", "is", "ilike", "order", "limit"]) builder[method] = () => builder;
      const response = table === "products"
        ? { data: [{ id: "11111111-1111-4111-8111-111111111111", name: "Keyboard", thumbnail: null, base_price: h.component ? 0 : 100000, stock_quantity: 10, max_quantity: 5, product_type: h.component ? "component" : "standard", is_active: true, is_pre_order: false, pre_order_config: null, category_id: null }], error: null }
        : table === "product_variants"
          ? { data: h.component ? [{ id: "842041c6eb11", product_id: "11111111-1111-4111-8111-111111111111", variant_name: "Coating - Red", price_adjustment: 0, stock_quantity: 3, is_pre_order: false }] : [], error: null }
          : table === "product_components"
            ? { data: [{ component_product_id: "11111111-1111-4111-8111-111111111111", parent: { id: "44444444-4444-4444-8444-444444444444", name: "Plato kit", base_price: 6000000, product_type: "kit", is_active: true } }], error: h.parentsError ? { message: "failed" } : null }
          : table === "categories"
            ? { data: [], error: null }
            : { data: [], error: null };
      builder.then = (resolve: (value: unknown) => unknown) => resolve(response);
      builder.maybeSingle = async () => ({ data: null, error: null });
      return builder;
    },
    rpc: h.rpc,
  }),
}));

import { GET, POST } from "./route";

function request(body: unknown, origin = "http://localhost") {
  return new NextRequest("http://localhost/api/orders/quick", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

const validBody = {
  customer: { name: "Walk-in", phone: "", address: "Main Street" },
  shipping_fee: 10000,
  payment: { payment_type: "full", mark_paid_now: false },
  items: [{ product_id: "11111111-1111-4111-8111-111111111111", quantity: 2 }],
};

beforeEach(() => {
  h.user = { id: "admin-1" };
  h.role = "admin";
  h.component = false;
  h.parentsError = false;
  h.rpc.mockReset().mockResolvedValue({ data: { order_id: "id", order_number: "ORD-1", status: "pending" }, error: null });
  h.invalidations.mockReset().mockResolvedValue(undefined);
  h.invoice.mockReset().mockResolvedValue("https://invoice.example/order.pdf");
});

describe("POST /api/orders/quick", () => {
  it("returns parent base price in lookup and uses it when saving a component variant", async () => {
    h.component = true;
    const options = await GET(new NextRequest("http://localhost/api/orders/quick"));
    expect((await options?.json()).products[0]).toMatchObject({ base_price: 6000000, pricing_parents: [{ base_price: 6000000 }] });
    const response = await POST(request({ ...validBody, items: [{ ...validBody.items[0], variant_id: "842041c6eb11", base_price: 1 }] }));
    expect(response?.status).toBe(201);
    expect(h.rpc).toHaveBeenCalledWith("admin_create_quick_order", expect.objectContaining({ p_items: [expect.objectContaining({ product_id: validBody.items[0].product_id, variant_id: "842041c6eb11", unit_price: 6000000 })] }));
  });

  it("does not fall back to component pricing when parent lookup fails", async () => {
    h.component = true;
    h.parentsError = true;
    const response = await POST(request({ ...validBody, items: [{ ...validBody.items[0], variant_id: "842041c6eb11" }] }));
    expect(response?.status).toBe(503);
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("requires a signed-in admin", async () => {
    h.user = null;
    const response = await POST(request(validBody));
    expect(response?.status).toBe(401);
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("rejects a non-admin and foreign origins", async () => {
    h.role = "user";
    expect((await POST(request(validBody)))?.status).toBe(403);
    h.role = "admin";
    expect((await POST(request(validBody, "https://evil.example")))?.status).toBe(403);
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("validates the payload before any order RPC", async () => {
    const response = await POST(request({ ...validBody, shipping_fee: -10 }));
    expect(response?.status).toBe(400);
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("prices from catalog values and delegates atomic reservation to the RPC", async () => {
    const response = await POST(request(validBody));
    expect(response?.status).toBe(201);
    expect(response?.headers.get("cache-control")).toBe("private, no-store");
    expect(h.rpc).toHaveBeenCalledWith("admin_create_quick_order", expect.objectContaining({
      p_total_price: 210000,
      p_shipping_fee: 10000,
      p_payment_type: "full",
      p_mark_paid_now: false,
      p_items: [expect.objectContaining({ unit_price: 100000, quantity: 2, is_pre_order: false })],
    }));
    expect(h.invalidations).toHaveBeenCalledOnce();
    expect(h.invoice).toHaveBeenCalledOnce();
    expect(h.invoice).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      orderNumber: expect.stringMatching(/^ORD-/),
      customerName: "Walk-in",
      customerAddress: "Main Street",
      total: 210000,
      paidAmount: 0,
    }));
    expect((await response?.json()).invoice_url).toBe("https://invoice.example/order.pdf");
  });

  it("creates an invoice and records deposit payment fields when selected", async () => {
    const response = await POST(request({ ...validBody, payment: { payment_type: "deposit_cod", mark_paid_now: true, deposit_percentage: 25 } }));
    expect(response?.status).toBe(201);
    expect(h.rpc).toHaveBeenCalledWith("admin_create_quick_order", expect.objectContaining({ p_payment_type: "deposit_cod", p_deposit_percentage: 25, p_deposit_amount: 50000, p_remaining_amount: 160000, p_mark_paid_now: true }));
    expect(h.invoice).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ paymentType: "deposit_cod", depositPercentage: 25, depositAmount: 50000, balanceDue: 160000, paidAmount: 50000 }));
    expect((await response?.json()).invoice_url).toBe("https://invoice.example/order.pdf");
  });

  it("rejects invalid payment details before creating an order", async () => {
    const response = await POST(request({ ...validBody, payment: { payment_type: "deposit_cod", mark_paid_now: false, deposit_percentage: 101 } }));
    expect(response?.status).toBe(400);
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("maps stock-reservation failures to a conflict without exposing database details", async () => {
    h.rpc.mockResolvedValue({ data: null, error: { message: "insufficient_product_stock" } });
    const response = await POST(request(validBody));
    expect(response?.status).toBe(409);
    expect(await response?.json()).toEqual({ error: "Order could not be created. Product stock or voucher availability may have changed; refresh and retry." });
    expect(h.invalidations).not.toHaveBeenCalled();
    expect(h.invoice).not.toHaveBeenCalled();
  });

  it("keeps order creation successful but reports invoice generation failure for retry", async () => {
    h.invoice.mockResolvedValue(null);
    const response = await POST(request(validBody));
    expect(response?.status).toBe(201);
    expect((await response?.json()).invoice_url).toBeNull();
    expect(h.rpc).toHaveBeenCalledOnce();
  });
});
