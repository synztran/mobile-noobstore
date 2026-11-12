import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ revalidateTag: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));

import { POST } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
  mocks.revalidateTag.mockReset();
});

describe("POST /api/cache/revalidate", () => {
  it("requires the internal shared secret", async () => {
    vi.stubEnv("NOTIFICATION_INTERNAL_SECRET", "expected");
    const response = await POST(
      new Request("http://localhost/api/cache/revalidate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-secret": "wrong",
        },
        body: JSON.stringify({ tags: ["testimonials"] }),
      })
    );
    expect(response.status).toBe(401);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it("revalidates only allowlisted product and testimonial tags", async () => {
    vi.stubEnv("NOTIFICATION_INTERNAL_SECRET", "expected");
    const response = await POST(
      new Request("http://localhost/api/cache/revalidate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-secret": "expected",
        },
        body: JSON.stringify({ tags: ["testimonials", "products", "users"] }),
      })
    );
    expect(response.status).toBe(200);
    expect(mocks.revalidateTag.mock.calls.map(([tag]) => tag)).toEqual([
      "testimonials",
      "products",
    ]);
    expect(await response.json()).toEqual({
      revalidated: ["testimonials", "products"],
    });
  });
});
