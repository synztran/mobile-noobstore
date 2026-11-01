import { describe, expect, it, vi } from "vitest";

import {
  sendOrderStatusEmail,
  sendPaymentReminderEmail,
  sendPickupCodeEmail,
  sendShippingUpdateEmail,
} from "./email.service";

describe("legacy email senders", () => {
  it("return false without a provider configured", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const payload = { to: "customer@example.com", orderNumber: "ORD-1" };

    await expect(
      sendPaymentReminderEmail({ ...payload, totalPrice: 1000, hoursElapsed: 2 }),
    ).resolves.toBe(false);
    await expect(
      sendPickupCodeEmail({
        ...payload,
        fullName: "Customer",
        code: "123456",
        expiresAt: new Date(),
      }),
    ).resolves.toBe(false);
    await expect(
      sendShippingUpdateEmail({
        ...payload,
        formattedFee: null,
        feeWasQuoted: false,
        trackingNumber: null,
        carrierName: null,
        trackingUrl: null,
      }),
    ).resolves.toBe(false);
    await expect(
      sendOrderStatusEmail({
        ...payload,
        status: "confirmed",
        formattedTotal: "1.000 ₫",
        formattedShippingFee: null,
        lines: [],
      }),
    ).resolves.toBe(false);

    expect(warn).toHaveBeenCalledTimes(4);
    warn.mockRestore();
  });
});
