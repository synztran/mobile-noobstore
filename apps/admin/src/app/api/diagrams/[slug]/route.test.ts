import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profileQuery: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({ readFile: mocks.readFile }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: mocks.profileQuery }),
      }),
    }),
  }),
}));

import { GET } from "./route";

describe("GET /api/diagrams/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "admin-id" } } });
    mocks.profileQuery.mockResolvedValue({ data: { role: "admin" }, error: null });
    mocks.readFile.mockResolvedValue("<html>diagram</html>");
  });

  it("rejects unauthenticated requests", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    const response = await GET(new Request("https://admin.test/api/diagrams/cart-module"), {
      params: Promise.resolve({ slug: "cart-module" }),
    });

    expect(response.status).toBe(401);
    expect(mocks.readFile).not.toHaveBeenCalled();
  });

  it("rejects authenticated non-admin users", async () => {
    mocks.profileQuery.mockResolvedValue({ data: { role: "staff" }, error: null });

    const response = await GET(new Request("https://admin.test/api/diagrams/cart-module"), {
      params: Promise.resolve({ slug: "cart-module" }),
    });

    expect(response.status).toBe(403);
    expect(mocks.readFile).not.toHaveBeenCalled();
  });

  it("serves only a catalogued diagram with private sandbox headers", async () => {
    const response = await GET(new Request("https://admin.test/api/diagrams/cart-module"), {
      params: Promise.resolve({ slug: "cart-module" }),
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("<html>diagram</html>");
    expect(mocks.readFile).toHaveBeenCalledWith(
      expect.stringMatching(/diagrams[\\/]cart-module\.html$/),
      "utf8",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN");
  });

  it("does not resolve arbitrary paths from a slug", async () => {
    const response = await GET(new Request("https://admin.test/api/diagrams/../../secret"), {
      params: Promise.resolve({ slug: "../../secret" }),
    });

    expect(response.status).toBe(404);
    expect(mocks.readFile).not.toHaveBeenCalled();
  });
});
