import { describe, expect, it } from "vitest";

import { getRateLimitKey } from "./ratelimit";

function reqWith(headers: Record<string, string>): Request {
  return new Request("https://noobstore.xyz/api/products", { headers });
}

describe("getRateLimitKey", () => {
  it("prefers an explicit user id over any IP header", () => {
    const key = getRateLimitKey(
      reqWith({ "x-forwarded-for": "203.0.113.7" }),
      "user-123",
    );
    expect(key).toBe("user-123");
  });

  it("uses the first entry of a multi-value x-forwarded-for", () => {
    const key = getRateLimitKey(
      reqWith({ "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178" }),
    );
    expect(key).toBe("203.0.113.7");
  });

  it("trims surrounding whitespace", () => {
    const key = getRateLimitKey(
      reqWith({ "x-forwarded-for": "  203.0.113.7  , 10.0.0.1" }),
    );
    expect(key).toBe("203.0.113.7");
  });

  it("prefers x-vercel-forwarded-for over x-forwarded-for", () => {
    // A proxy in front of Vercel can overwrite x-forwarded-for, but not
    // x-vercel-forwarded-for — so the latter must win.
    const key = getRateLimitKey(
      reqWith({
        "x-vercel-forwarded-for": "198.51.100.9",
        "x-forwarded-for": "10.1.1.1",
      }),
    );
    expect(key).toBe("198.51.100.9");
  });

  it("falls back to x-forwarded-for then x-real-ip", () => {
    expect(getRateLimitKey(reqWith({ "x-forwarded-for": "203.0.113.7" }))).toBe(
      "203.0.113.7",
    );
    expect(getRateLimitKey(reqWith({ "x-real-ip": "192.0.2.44" }))).toBe(
      "192.0.2.44",
    );
  });

  it("ignores an empty header rather than bucketing everyone together", () => {
    // An empty string must NOT become the key: every such request would share
    // one bucket, letting one caller exhaust the limit for all users.
    expect(
      getRateLimitKey(
        reqWith({ "x-vercel-forwarded-for": "", "x-forwarded-for": "" }),
      ),
    ).toBe("127.0.0.1");

    expect(
      getRateLimitKey(
        reqWith({
          "x-vercel-forwarded-for": "",
          "x-forwarded-for": "203.0.113.7",
        }),
      ),
    ).toBe("203.0.113.7");

    expect(
      getRateLimitKey(reqWith({ "x-vercel-forwarded-for": "   " })),
    ).toBe("127.0.0.1");
  });

  it("returns a stable fallback when no IP header is present", () => {
    expect(getRateLimitKey(reqWith({}))).toBe("127.0.0.1");
  });
});
