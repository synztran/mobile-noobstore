import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { id: "admin-1" } as { id: string } | null,
  role: "admin" as string | null,
  rows: [] as Record<string, unknown>[],
  error: null as { message: string } | null,
  invalidated: [] as string[],
  inserted: [] as Record<string, unknown>[],
  updated: [] as Array<{ id: string | null; patch: Record<string, unknown> }>,
  deleted: [] as Array<string | null>,
  fetch: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: mocks.user }, error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: mocks.role ? { role: mocks.role } : null,
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: () => ({
    from: (table: string) => {
      expect(table).toBe("testimonials");
      const builder: Record<string, (...args: any[]) => any> = {};
      let action: "read" | "insert" | "update" | "delete" = "read";
      let rowId: string | null = null;
      let patch: Record<string, unknown> = {};
      builder.select = () => builder;
      builder.order = () => builder;
      builder.insert = (data: Record<string, unknown>) => {
        action = "insert";
        mocks.inserted.push(data);
        return builder;
      };
      builder.update = (data: Record<string, unknown>) => {
        action = "update";
        patch = data;
        return builder;
      };
      builder.delete = () => {
        action = "delete";
        return builder;
      };
      builder.eq = (key: string, value: string) => {
        if (key === "id") rowId = value;
        return builder;
      };
      const mutationResult = () => {
        if (mocks.error) return { data: null, error: mocks.error };
        if (action === "insert")
          return { data: mocks.rows[0] ?? null, error: null };
        if (action === "update") {
          mocks.updated.push({ id: rowId, patch });
          const row = mocks.rows.find((item) => item.id === rowId);
          return { data: row ? { ...row, ...patch } : null, error: null };
        }
        if (action === "delete") {
          mocks.deleted.push(rowId);
          return { data: rowId ? { id: rowId } : null, error: null };
        }
        return { data: mocks.rows[0] ?? null, error: null };
      };
      builder.single = async () => mutationResult();
      builder.maybeSingle = async () => mutationResult();
      builder.then = (resolve: (value: unknown) => unknown) =>
        resolve({ data: mocks.rows, error: mocks.error });
      return builder;
    },
  }),
}));

vi.mock("@web-cache", () => ({
  CACHE_KEYS: { testimonials: "v2:testimonials" },
  invalidateCache: async (key: string) => {
    mocks.invalidated.push(key);
  },
}));

import { GET, POST } from "./route";
import { DELETE, PATCH } from "./[id]/route";

function request(method: string, body?: unknown) {
  return new NextRequest("http://localhost/api/testimonials", {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
}

const valid = {
  name: null,
  product: "Keyboard",
  rating: 5,
  text: "Great purchase",
  date: "2026-11-05",
  image_url: "https://images.example/review.jpg",
  is_active: true,
  order: 1,
};

beforeEach(() => {
  mocks.user = { id: "admin-1" };
  mocks.role = "admin";
  mocks.rows = [{ id: "review-1", ...valid }];
  mocks.error = null;
  mocks.invalidated = [];
  mocks.inserted = [];
  mocks.updated = [];
  mocks.deleted = [];
  mocks.fetch.mockReset();
});

describe("admin testimonial API", () => {
  it("rejects unauthenticated and non-admin users", async () => {
    mocks.user = null;
    const unauthorized = await GET();
    if (!unauthorized) throw new Error("GET must return a response");
    expect(unauthorized.status).toBe(401);
    mocks.user = { id: "customer" };
    mocks.role = "customer";
    const forbidden = await POST(request("POST", valid));
    expect(forbidden?.status).toBe(403);
  });

  it("lists rows without caching them in the browser", async () => {
    const response = await GET();
    if (!response) throw new Error("GET must return a response");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toHaveLength(1);
  });

  it("creates validated rows and invalidates shared testimonial cache", async () => {
    const response = await POST(request("POST", valid));
    if (!response) throw new Error("POST must return a response");
    expect(response.status).toBe(201);
    expect(mocks.inserted).toEqual([valid]);
    expect(mocks.invalidated).toEqual(["v2:testimonials"]);
  });

  it("rejects invalid create and patch payloads", async () => {
    const invalidCreate = await POST(request("POST", { ...valid, rating: 6 }));
    expect(invalidCreate?.status).toBe(400);
    const invalidPatch = await PATCH(request("PATCH", {}), {
      params: Promise.resolve({ id: "review-1" }),
    });
    expect(invalidPatch?.status).toBe(400);
    expect(mocks.invalidated).toEqual([]);
  });

  it("updates, deactivates and deletes rows with cache invalidation", async () => {
    const patch = await PATCH(
      request("PATCH", { is_active: false, order: 3 }),
      { params: Promise.resolve({ id: "review-1" }) }
    );
    if (!patch) throw new Error("PATCH must return a response");
    expect(patch.status).toBe(200);
    expect(mocks.updated).toEqual([
      {
        id: "review-1",
        patch: { is_active: false, order: 3, updated_at: expect.any(String) },
      },
    ]);
    const deleted = await DELETE(request("DELETE"), {
      params: Promise.resolve({ id: "review-1" }),
    });
    if (!deleted) throw new Error("DELETE must return a response");
    expect(deleted.status).toBe(200);
    expect(mocks.deleted).toEqual(["review-1"]);
    expect(mocks.invalidated).toEqual(["v2:testimonials", "v2:testimonials"]);
  });

  it("does not invalidate cache when the database write fails", async () => {
    mocks.error = { message: "database unavailable" };
    const response = await POST(request("POST", valid));
    if (!response) throw new Error("POST must return a response");
    expect(response.status).toBe(500);
    expect(mocks.invalidated).toEqual([]);
  });
});
