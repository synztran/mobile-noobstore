import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  productQuery: vi.fn(),
  feesQuery: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getSession: mocks.getSession } }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: () => ({
    from: (table: string) => ({
      select: () => {
        const query = {
          eq: () => query,
          limit: () => query,
          maybeSingle: () => mocks.feesQuery(),
          then: (resolve: (value: unknown) => unknown) =>
            Promise.resolve(mocks.productQuery()).then(resolve),
        };
        return table === "fees"
          ? { eq: () => ({ maybeSingle: mocks.feesQuery }) }
          : query;
      },
    }),
  }),
}));

import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    mocks.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mocks.productQuery.mockResolvedValue({ data: [], error: null });
    mocks.feesQuery.mockResolvedValue({ data: { id: 1 }, error: null });
  });

  it("returns only aggregate status when all probes succeed", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "healthy" });
  });

  it("returns degraded when product catalog probe fails", async () => {
    mocks.productQuery.mockResolvedValue({
      data: null,
      error: { code: "XX000", message: "internal table detail" },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "degraded" });
  });

  it("returns degraded when fees config probe fails", async () => {
    mocks.feesQuery.mockResolvedValue({
      data: null,
      error: { code: "XX000", message: "internal table detail" },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "degraded" });
  });

  it("returns degraded when auth probe fails", async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: null },
      error: { code: "AUTH_DOWN", message: "private auth detail" },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "degraded" });
  });

  it("returns generic error without exception details if evaluation throws", async () => {
    mocks.getSession.mockRejectedValue(new Error("private connection detail"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ status: "error" });
  });
});
