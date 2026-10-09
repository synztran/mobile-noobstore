import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// The sender calls Resend and reads process.env at call time. Stub the SDK so
// these tests assert OUR behaviour (subject, recipients, trigger rules, failure
// handling) rather than making network calls.
const send = vi.fn(async (_payload: any) => ({
  data: { id: "1" },
  error: null as { message: string } | null,
}));

/**
 * Stand-in for `new Resend(key)`. The real constructor throws when the key is
 * empty, and email.service.ts caches the client in a module-level singleton —
 * so the mock must reproduce BOTH behaviours or the missing-key path can never
 * be exercised.
 */
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
    constructor(apiKey: string) {
      if (!apiKey) throw new Error("Missing API key");
    }
  },
}));

const {
  ORDER_STATUS_EMAIL_STATUSES,
  shouldSendOrderStatusEmail,
  sendOrderStatusEmail,
} = await import("./email.service");

// email.service.ts caches its Resend client in a module-level singleton, so the
// "no API key" test can only observe a throw on the FIRST construction. Every
// other test therefore needs a client already in place, and the key must be set
// from the start.
process.env.RESEND_API_KEY = "re_test";
process.env.RESEND_FROM_EMAIL = "Noob Store <no-reply@example.com>";

const baseParams = {
  to: "khach@example.com",
  orderNumber: "ORD-ABC123",
  status: "confirmed" as const,
  formattedTotal: "1.500.000 ₫",
  formattedShippingFee: null,
  lines: [],
};

describe("shouldSendOrderStatusEmail", () => {
  it("fires for the paid and in-transit statuses", () => {
    for (const s of ORDER_STATUS_EMAIL_STATUSES) {
      expect(shouldSendOrderStatusEmail(s)).toBe(true);
    }
  });

  it("includes the deposit statuses, which replace `confirmed` for deposit_cod orders", () => {
    // The admin route REJECTS `confirmed` when payment_type === "deposit_cod"
    // and forces first_paid/second_paid. Without these two, no deposit or
    // pre-order customer would ever receive a status mail.
    expect(ORDER_STATUS_EMAIL_STATUSES).toContain("first_paid");
    expect(ORDER_STATUS_EMAIL_STATUSES).toContain("second_paid");
  });

  it("does not fire for statuses with no customer-facing email", () => {
    for (const s of ["pending", "delivered", "returning", "cancelled", "refunded"]) {
      expect(shouldSendOrderStatusEmail(s)).toBe(false);
    }
  });

  it("handles null and undefined", () => {
    expect(shouldSendOrderStatusEmail(null)).toBe(false);
    expect(shouldSendOrderStatusEmail(undefined)).toBe(false);
    expect(shouldSendOrderStatusEmail("")).toBe(false);
  });
});

describe("sendOrderStatusEmail", () => {
  beforeEach(() => {
    send.mockClear();
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_FROM_EMAIL = "Noob Store <no-reply@example.com>";
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    vi.restoreAllMocks();
  });

  it("sends to the customer with a status-prefixed subject", async () => {
    const ok = await sendOrderStatusEmail(baseParams);
    expect(ok).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    const arg = send.mock.calls[0][0];
    expect(arg.to).toBe("khach@example.com");
    expect(arg.subject).toContain("ORD-ABC123");
    expect(arg.subject).toMatch(/^\[Noob Store\]/);
  });

  it("uses distinct subjects per status", async () => {
    const subjects = new Set<string>();
    for (const status of ORDER_STATUS_EMAIL_STATUSES) {
      await sendOrderStatusEmail({ ...baseParams, status });
      subjects.add(send.mock.calls[send.mock.calls.length - 1][0].subject);
    }
    // Each status must be distinguishable in the customer's inbox.
    expect(subjects.size).toBe(ORDER_STATUS_EMAIL_STATUSES.length);
  });

  it("returns false without sending for a non-notify status", async () => {
    const ok = await sendOrderStatusEmail({
      ...baseParams,
      status: "delivered" as never,
    });
    expect(ok).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it("returns false and does NOT throw when RESEND_API_KEY is missing", async () => {
    // This is the failure that made admin emails silently vanish: the sender
    // threw internally, the catch swallowed it, and the caller discarded false.
    //
    // Needs a FRESH module instance — email.service.ts caches its Resend client
    // in a module-level singleton, so once any earlier test has built a client
    // the key is never read again and the throw can never happen.
    vi.resetModules();
    const savedKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    try {
      const fresh = await import("./email.service");
      const ok = await fresh.sendOrderStatusEmail(baseParams);
      expect(ok).toBe(false);
    } finally {
      process.env.RESEND_API_KEY = savedKey;
      vi.resetModules();
    }
  });

  it("returns false when Resend reports an error", async () => {
    send.mockResolvedValueOnce({
      data: null,
      error: { message: "domain not verified" },
    } as never);
    const ok = await sendOrderStatusEmail(baseParams);
    expect(ok).toBe(false);
  });

  it("renders line items, variant labels, total and the order link", async () => {
    await sendOrderStatusEmail({
      ...baseParams,
      fullName: "Nguyễn Văn A",
      lines: [
        {
          name: "GMK Stargaze",
          variantName: "Base",
          quantity: 2,
          formattedLineTotal: "3.000.000 ₫",
        },
      ],
      formattedAddress: "123 Nguyễn Huệ, Q.1, TP.HCM",
      orderUrl: "https://www.noobstore.xyz/profile/orders?orderNumber=ORD-ABC123",
    });
    const html = send.mock.calls[0][0].html as string;
    expect(html).toContain("GMK Stargaze");
    expect(html).toContain("Base");
    expect(html).toContain("1.500.000 ₫");
    expect(html).toContain("Nguyễn Văn A");
    expect(html).toContain("profile/orders?orderNumber=ORD-ABC123");
    // Vietnamese, matching the rest of the service.
    expect(html).toContain('lang="vi"');
  });

  it("omits the shipping row when no fee was quoted", async () => {
    await sendOrderStatusEmail(baseParams);
    const html = send.mock.calls[0][0].html as string;
    expect(html).not.toContain("Phí vận chuyển");
  });

  it("shows the shipping row once a fee exists", async () => {
    await sendOrderStatusEmail({
      ...baseParams,
      formattedShippingFee: "35.000 ₫",
    });
    expect(send.mock.calls[0][0].html as string).toContain("Phí vận chuyển");
  });
});