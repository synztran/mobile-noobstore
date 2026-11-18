import { describe, expect, it } from "vitest";

const { notifyOrderStatusEmail } = await import("./order-status-email");

describe("notifyOrderStatusEmail", () => {
  it("skips email delivery without querying Supabase", async () => {
    const supabase = {
      from: () => {
        throw new Error("email pause must not query Supabase");
      },
    };
    const result = await notifyOrderStatusEmail(supabase, "order-1", "confirmed");

    expect(result).toEqual({
      outcome: "skipped",
      reason: "Email delivery temporarily disabled",
    });
  });
});
