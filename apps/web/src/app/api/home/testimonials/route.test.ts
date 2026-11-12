import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rows: [] as Array<Record<string, any>>,
  error: null as { message: string } | null,
  redisValue: null as Array<Record<string, any>> | null,
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/redis/cache", () => ({
  CACHE_KEYS: { testimonials: "v2:testimonials" },
  getCache: async () => mocks.redisValue,
  setCache: async (_key: string, value: Array<Record<string, any>>) => {
    mocks.redisValue = value;
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: () => ({
    from: (table: string) => {
      expect(table).toBe("testimonials");
      const builder: Record<string, (...args: any[]) => any> = {};
      for (const method of ["select", "eq", "order"]) {
        builder[method] = () => builder;
      }
      builder.then = (resolve: (value: unknown) => unknown) =>
        resolve({ data: mocks.rows, error: mocks.error });
      return builder;
    },
  }),
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => Promise<unknown>) => async () => {
    mocks.revalidateTag("testimonials");
    return fn();
  },
  revalidateTag: mocks.revalidateTag,
}));

import { GET } from "./route";

beforeEach(() => {
  mocks.rows = [];
  mocks.error = null;
  mocks.redisValue = null;
  mocks.revalidateTag.mockReset();
});

describe("GET /api/home/testimonials", () => {
  it("returns only active source rows with an exact summary for more than twenty entries", async () => {
    mocks.rows = Array.from({ length: 25 }, (_, index) => ({
      id: String(index + 1),
      name: index === 0 ? null : `Reviewer ${index + 1}`,
      rating: index === 24 ? 1 : 5,
      text: "Review text",
      product: null,
      date: "2026-11-05",
      image_url: null,
    }));
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      testimonials: mocks.rows,
      summary: { count: 25, averageRating: 4.84 },
    });
  });

  it("returns a null average for no active testimonials", async () => {
    const response = await GET();
    expect(await response.json()).toEqual({
      testimonials: [],
      summary: { count: 0, averageRating: null },
    });
  });

  it("serves the full active set from Redis without querying the database", async () => {
    mocks.redisValue = [
      {
        id: "cached",
        rating: 4,
        name: "Reviewer",
        text: "Good",
        product: null,
        date: "2026-11-05",
        image_url: null,
      },
    ];
    const response = await GET();
    expect((await response.json()).summary).toEqual({
      count: 1,
      averageRating: 4,
    });
  });

  it("returns a safe error when the source query fails", async () => {
    mocks.error = { message: "database failure" };
    const response = await GET();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal server error" });
  });
});
