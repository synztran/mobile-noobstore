import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCronSecret: vi.fn(),
  drainPaymentSecurityAlerts: vi.fn(),
  bsTrigger: vi.fn(),
  bsResolve: vi.fn(),
  bsFindBySource: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/lib/auth/requireCronSecret", () => ({
  requireCronSecret: mocks.requireCronSecret,
}));
vi.mock("@/modules/payments/server/drain-alerts", () => ({
  drainPaymentSecurityAlerts: mocks.drainPaymentSecurityAlerts,
}));
vi.mock("@/lib/betterstack", () => ({
  bsTrigger: mocks.bsTrigger,
  bsResolve: mocks.bsResolve,
  bsFindBySource: mocks.bsFindBySource,
  HEALTH_PAGE_CHANNELS: { call: true, sms: true, email: true, push: true },
}));

import { NextRequest, NextResponse } from "next/server";
import { POST } from "./route";

function request() {
  return new NextRequest("https://noobstore.test/api/cron/health-check", {
    method: "POST",
    headers: { authorization: "Bearer test-secret" },
  });
}

describe("POST /api/cron/health-check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCronSecret.mockReturnValue(null);
    mocks.drainPaymentSecurityAlerts.mockResolvedValue(undefined);
    mocks.bsTrigger.mockResolvedValue({ data: { id: "incident-1" } });
    mocks.bsResolve.mockResolvedValue({ data: { id: "incident-1" } });
    mocks.bsFindBySource.mockResolvedValue(null);
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.fetch.mockReset();
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "healthy" }),
    });
  });

  it("rejects missing cron auth before probing or paging", async () => {
    mocks.requireCronSecret.mockReturnValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.bsTrigger).not.toHaveBeenCalled();
  });

  it("resolves an open incident when health returns healthy", async () => {
    mocks.bsFindBySource.mockResolvedValue("incident-1");

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.bsResolve).toHaveBeenCalledWith("incident-1");
  });

  it("creates a generic customer-safe incident for degraded status", async () => {
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "degraded",
        tables: { users: { error: "private" } },
      }),
    });

    await POST(request());

    expect(mocks.bsTrigger).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: "NoobStore đang gặp gián đoạn dịch vụ",
        cause: expect.not.stringContaining("users"),
      })
    );
  });

  it("does not duplicate an already-open degraded incident", async () => {
    mocks.bsFindBySource.mockResolvedValue("incident-1");
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "degraded" }),
    });

    await POST(request());

    expect(mocks.bsFindBySource).toHaveBeenCalledWith("noobstore-health-check");
    expect(mocks.bsTrigger).not.toHaveBeenCalled();
  });

  it("returns a generic error for non-2xx health responses without leaking body", async () => {
    mocks.fetch.mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => "secret backend details",
    });

    const response = await POST(request());

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ status: "error" });
    expect(mocks.bsTrigger).not.toHaveBeenCalled();
  });

  it("does not leak Better Stack failures into the cron response", async () => {
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "degraded" }),
    });
    mocks.bsTrigger.mockRejectedValue(
      new Error("private Better Stack response")
    );

    const response = await POST(request());

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ status: "error" });
  });

  it("returns generic error if Better Stack incident lookup fails", async () => {
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "degraded" }),
    });
    mocks.bsFindBySource.mockRejectedValue(new Error("private lookup failure"));
    mocks.bsTrigger.mockClear();

    const response = await POST(request());

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ status: "error" });
    expect(mocks.bsTrigger).not.toHaveBeenCalled();
  });
});
