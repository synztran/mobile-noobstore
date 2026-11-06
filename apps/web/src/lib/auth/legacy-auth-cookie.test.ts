import { NextRequest, NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearLegacyAuthCookie,
  expireDuplicateAuthCookies,
} from "./legacy-auth-cookie";

function setCookies(response: NextResponse) {
  return response.headers.getSetCookie();
}

function requestWith(cookie: string, host = "www.noobstore.xyz") {
  return new NextRequest(`https://${host}/api/cart`, {
    headers: { cookie },
  });
}

function cleanup(cookie: string, host = "www.noobstore.xyz") {
  const request = requestWith(cookie, host);
  const response = NextResponse.next();
  expireDuplicateAuthCookies(response, request);
  return setCookies(response);
}

afterEach(() => vi.unstubAllEnvs());

describe("expireDuplicateAuthCookies", () => {
  it("expires the host-only copy when the same whole cookie appears twice", () => {
    vi.stubEnv("NEXT_PUBLIC_COOKIE_DOMAIN", ".noobstore.xyz");

    const cookies = cleanup(
      "sb-testref-auth-token=old; sb-testref-auth-token=new; theme=dark"
    );

    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toContain("sb-testref-auth-token=");
    // No Domain attribute targets the host-only copy only.
    expect(cookies[0]).not.toContain("Domain=");
    expect(cookies[0]).toContain("Max-Age=0");
    expect(cookies.join("\n")).not.toContain("theme=");
  });

  it("expires every chunk name of a duplicated set, including unmatched chunks", () => {
    vi.stubEnv("NEXT_PUBLIC_COOKIE_DOMAIN", ".noobstore.xyz");

    const cookies = cleanup(
      [
        "sb-testref-auth-token.0=old0",
        "sb-testref-auth-token.1=old1",
        "sb-testref-auth-token.2=old2",
        "sb-testref-auth-token.0=new0",
        "sb-testref-auth-token.1=new1",
      ].join("; ")
    );

    const names = cookies.map((cookie) => cookie.split("=", 1)[0]).sort();
    expect(names).toEqual([
      "sb-testref-auth-token.0",
      "sb-testref-auth-token.1",
      "sb-testref-auth-token.2",
    ]);
  });

  it("leaves a single host-only session alone when no duplicate exists", () => {
    vi.stubEnv("NEXT_PUBLIC_COOKIE_DOMAIN", ".noobstore.xyz");

    expect(cleanup("sb-testref-auth-token=only; theme=dark")).toEqual([]);
  });

  it("does nothing when the shared cookie domain is not configured", () => {
    vi.stubEnv("NEXT_PUBLIC_COOKIE_DOMAIN", "");

    expect(
      cleanup("sb-testref-auth-token=old; sb-testref-auth-token=new")
    ).toEqual([]);
  });

  it("does nothing for hosts outside noobstore.xyz", () => {
    vi.stubEnv("NEXT_PUBLIC_COOKIE_DOMAIN", ".noobstore.xyz");

    expect(
      cleanup(
        "sb-testref-auth-token=old; sb-testref-auth-token=new",
        "shop.example.com"
      )
    ).toEqual([]);
  });
});

describe("clearLegacyAuthCookie", () => {
  it("does not overwrite a cookie the response already wrote", () => {
    vi.stubEnv("NEXT_PUBLIC_COOKIE_DOMAIN", ".noobstore.xyz");
    const request = requestWith("sb-testref-auth-token=old");
    const response = NextResponse.next();
    response.cookies.set("sb-testref-auth-token", "fresh", {
      domain: ".noobstore.xyz",
      path: "/",
    });

    clearLegacyAuthCookie(response, request);

    expect(setCookies(response)).toHaveLength(1);
    expect(setCookies(response)[0]).toContain("fresh");
  });
});
