import { describe, expect, it, vi, afterEach } from "vitest";

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) =>
      new Response(JSON.stringify(body), init),
  },
}));

import { requireCronSecret } from "./requireCronSecret";

function req(authorization?: string): Request {
  const headers = new Headers();
  if (authorization) headers.set("Authorization", authorization);
  return { headers } as Request;
}

describe("requireCronSecret (fail-closed)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is authorized when the Bearer secret matches", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(requireCronSecret(req("Bearer s3cret"))).toBeNull();
  });

  it("rejects a wrong secret with 401", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    const res = requireCronSecret(req("Bearer wrong"))!;
    expect(res.status).toBe(401);
  });

  it("rejects a missing Authorization header with 401", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    const res = requireCronSecret(req())!;
    expect(res.status).toBe(401);
  });

  it("fails closed (503) when the secret is not configured", () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = requireCronSecret(req("Bearer anything"))!;
    expect(res.status).toBe(503);
  });
});