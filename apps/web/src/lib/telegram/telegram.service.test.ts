import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
  vi.stubEnv("TELEGRAM_CHAT_ID", "private-test-chat");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, result: { message_id: 123 } }) }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("new order Telegram details", () => {
  it("includes deposit and saved delivery address, escaping untrusted content", async () => {
    const { notifyNewOrder } = await import("./telegram.service");
    await notifyNewOrder("NS123", "Customer", 1000000, undefined, 1, [], {
      paymentType: "deposit_cod", depositPercentage: 30, depositAmount: 300000, remainingAmount: 700000,
      shippingMethodId: "standard", shippingMethodName: "Giao tiêu chuẩn",
      address: { full_name: "<b>Customer</b>", phone_number: "0901234567", street_address: "123 Street", ward: "Ward", city: "HCMC" },
    });
    const message = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).text;
    expect(message).toContain("Đặt cọc (30%)");
    expect(message).toContain("chưa xác minh nhận tiền");
    expect(message).toContain("Còn lại:");
    expect(message).toContain("123 Street, Ward, HCMC");
    expect(message).toContain("&lt;b&gt;Customer&lt;/b&gt;");
  });
  it("omits address for pickup", async () => {
    const { notifyNewOrder } = await import("./telegram.service");
    await notifyNewOrder("NS123", "Customer", 1000, undefined, 1, [], {
      paymentType: "full", depositPercentage: 0, depositAmount: 0, remainingAmount: 0,
      shippingMethodId: "pickup", shippingMethodName: "Nhận tại cửa hàng", address: { street_address: "PRIVATE ADDRESS" },
    });
    const message = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).text;
    expect(message).toContain("Nhận tại cửa hàng");
    expect(message).not.toContain("PRIVATE ADDRESS");
    expect(message).not.toContain("Địa chỉ:");
  });
  it("sends original PNG as a document and captures Telegram message identity", async () => {
    const { sendPaymentEvidenceDocument } = await import("./telegram.service");
    const bytes = new Uint8Array([137, 80, 78, 71]);
    expect(await sendPaymentEvidenceDocument(bytes, "evidence", "qr.png")).toBe("123");
    const form = vi.mocked(fetch).mock.calls[0][1]!.body as FormData;
    const file = form.get("document") as Blob;
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(bytes);
  });
});
