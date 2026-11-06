import { NextRequest, NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearLegacyAuthCookie } from "@/modules/user/server/legacy-auth-cookie";

function getSetCookies(response: NextResponse) {
  return response.headers.getSetCookie();
}

describe("clearLegacyAuthCookie", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("expires old auth-cookie names only at host scope", () => {
    vi.stubEnv("NEXT_PUBLIC_COOKIE_DOMAIN", ".noobstore.xyz");
    const request = new NextRequest(
      "https://www.noobstore.xyz/api/auth/signin",
      {
        headers: {
          cookie:
            "sb-project-auth-token=old; sb-project-auth-token.0=chunk; theme=dark",
        },
      }
    );
    const response = NextResponse.json({ ok: true });

    clearLegacyAuthCookie(response, request);

    const cookies = getSetCookies(response);
    expect(cookies).toHaveLength(2);
    expect(cookies.join("\n")).toContain("sb-project-auth-token=");
    expect(cookies.join("\n")).toContain("sb-project-auth-token.0=");
    expect(cookies.join("\n")).not.toContain("Domain=");
    expect(cookies.join("\n")).toContain("Max-Age=0");
    expect(cookies.join("\n")).not.toContain("theme=");
  });

  it("does not set cleanup cookies for guests with no auth cookies", () => {
    vi.stubEnv("NEXT_PUBLIC_COOKIE_DOMAIN", ".noobstore.xyz");
    const request = new NextRequest(
      "https://www.noobstore.xyz/api/auth/signin"
    );
    const response = NextResponse.json({ ok: true });

    clearLegacyAuthCookie(response, request);

    expect(getSetCookies(response)).toEqual([]);
  });

  it("preserves host-only sessions when no cross-subdomain domain is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_COOKIE_DOMAIN", "");
    const request = new NextRequest("http://localhost:3000/api/auth/signin", {
      headers: { cookie: "sb-project-auth-token=old" },
    });
    const response = NextResponse.json({ ok: true });

    clearLegacyAuthCookie(response, request);

    expect(getSetCookies(response)).toEqual([]);
  });

  it("does not clear auth cookies for unrelated domains", () => {
    vi.stubEnv("NEXT_PUBLIC_COOKIE_DOMAIN", ".noobstore.xyz");
    const request = new NextRequest(
      "https://shop.example.com/api/auth/signin",
      {
        headers: { cookie: "sb-project-auth-token=old" },
      }
    );
    const response = NextResponse.json({ ok: true });

    clearLegacyAuthCookie(response, request);

    expect(getSetCookies(response)).toEqual([]);
  });
});
