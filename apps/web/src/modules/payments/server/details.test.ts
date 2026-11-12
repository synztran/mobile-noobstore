import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ user: { id: "owner" } as { id: string } | null,
  order: null as any, bank: null as any, receipts: [] as { amount: number }[],
  orderError: null as any, ledgerError: null as any, filters: [] as unknown[][] }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: mocks.user } }) },
  from: () => { const query = {
    select: () => query,
    eq: (...args: unknown[]) => { mocks.filters.push(args); return query; },
    maybeSingle: async () => ({ data: mocks.order, error: mocks.orderError }),
  }; return query; },
}) }));
vi.mock("@/lib/supabase/admin", () => ({ getAdminClient: () => ({
  from: (table: string) => { const query = {
    select: () => query, eq: () => query, order: () => query, limit: () => query,
    maybeSingle: async () => ({ data: mocks.bank, error: null }),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: table === "order_payment_receipts" ? mocks.receipts : mocks.bank, error: mocks.ledgerError }).then(resolve),
  }; return query; },
}) }));
import { paymentDetails } from "./details";

beforeEach(() => {
  mocks.user = { id: "owner" }; mocks.filters = []; mocks.orderError = null; mocks.ledgerError = null;
  mocks.order = { id: "order", order_number: "NS123", status: "pending", total_price: 1000,
    payment_type: "deposit_cod", deposit_amount: 300, shipping_fee: 0, shipping_method_id: "pickup" };
  mocks.bank = { id: "bank", platform_name: "MB Bank", account_number: "12345678", account_name: "STORE" };
  mocks.receipts = [{ amount: 100 }];
  vi.stubEnv("PAYMENT_BANK_ALLOWLIST", "mbbank:12345678");
});

describe("server-owned payment instructions", () => {
  it("requires authentication and owner-scopes order lookup", async () => {
    mocks.user = null;
    expect(await paymentDetails("NS123")).toEqual({ error: "Unauthorized", status: 401 });
    mocks.user = { id: "owner" }; mocks.order = null;
    expect(await paymentDetails("NS123")).toEqual({ error: "Order not found", status: 404 });
    expect(mocks.filters).toContainEqual(["user_id", "owner"]);
  });
  it("derives deposit and remaining balance only from stored totals and verified receipts", async () => {
    let result = await paymentDetails("NS123");
    expect("data" in result && result.data?.amountDue).toBe(200);
    mocks.receipts = [{ amount: 300 }];
    result = await paymentDetails("NS123");
    expect("data" in result && result.data?.amountDue).toBe(700);
    expect("payload" in result && result.payload).toContain("5403700");
  });
  it("treats first_paid as the first deposit being complete", async () => {
    mocks.order.status = "first_paid";
    mocks.receipts = [{ amount: 100 }];

    const result = await paymentDetails("NS123");

    expect("data" in result && result.data?.depositPaid).toBe(true);
    expect("data" in result && result.data?.amountDue).toBe(900);
  });
  it("fails closed for unapproved recipient or unavailable ledger", async () => {
    mocks.bank.account_number = "99999999";
    await expect(paymentDetails("NS123")).rejects.toThrow("deployment-approved");
    mocks.ledgerError = { message: "offline" };
    await expect(paymentDetails("NS123")).rejects.toThrow();
  });
  it("does not offer a QR on cancelled or fully settled orders", async () => {
    mocks.order.status = "cancelled";
    let result = await paymentDetails("NS123");
    expect("data" in result && result.data?.qrUrl).toBeNull();
    mocks.order.status = "confirmed"; mocks.receipts = [{ amount: 1100 }];
    result = await paymentDetails("NS123");
    expect("data" in result && result.data?.amountDue).toBe(0);
    expect("data" in result && result.data?.qrUrl).toBeNull();
  });
});
