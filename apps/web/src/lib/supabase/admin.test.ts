import { afterEach, describe, expect, it, vi } from "vitest";

const createClient = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClient(...args),
}));

describe("getAdminClient", () => {
  afterEach(() => {
    createClient.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("omits the invalid Bearer header for new-format secret API keys", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_test-key");
    createClient.mockReturnValue({});

    const { getAdminClient } = await import("./admin");
    getAdminClient();

    const [, , options] = createClient.mock.calls[0];
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        expect(headers.get("apikey")).toBe("sb_secret_test-key");
        expect(headers.has("Authorization")).toBe(false);
        return new Response(null, { status: 200 });
      }
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await options.global.fetch(
      "https://project.supabase.co/rest/v1/users",
      {
        headers: {
          apikey: "sb_secret_test-key",
          Authorization: "Bearer sb_secret_test-key",
        },
      }
    );

    expect(result.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("preserves SDK auth headers for legacy JWT service-role keys", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "eyJlegacy-service-role-jwt");
    createClient.mockReturnValue({});

    const { getAdminClient } = await import("./admin");
    getAdminClient();

    const [, , options] = createClient.mock.calls.at(-1)!;
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        expect(new Headers(init?.headers).get("Authorization")).toBe(
          "Bearer eyJlegacy-service-role-jwt"
        );
        return new Response(null, { status: 200 });
      }
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await options.global.fetch(
      "https://project.supabase.co/rest/v1/users",
      {
        headers: { Authorization: "Bearer eyJlegacy-service-role-jwt" },
      }
    );

    expect(result.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
