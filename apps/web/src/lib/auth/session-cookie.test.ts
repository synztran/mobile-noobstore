import { describe, expect, it, vi } from "vitest";

// Importing the package's internal codec is deliberate: this module is written
// against a wire format the app does not own, and a silent format change would
// lock every signed-in visitor out of /checkout. If the package ever
// restructures, this import fails and the test fails loudly rather than
// quietly passing.
import { stringToBase64URL } from "@supabase/ssr/dist/main/utils/base64url.js";

import {
  base64UrlDecode,
  decodeAuthTokenValue,
  hasUsableSessionCookie,
  resolveAuthTokenValue,
  type AuthCookie,
} from "./session-cookie";

/**
 * Encode a payload the way `@supabase/ssr` does at its default
 * `cookieEncoding: "base64url"` — `base64-` + unpadded base64url of the JSON.
 */
function encodeSession(payload: unknown): string {
  return (
    "base64-" +
    Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
  );
}

/** Split an encoded value into `sb-<ref>-auth-token.<n>` chunks. */
function chunked(value: string, size: number): AuthCookie[] {
  const cookies: AuthCookie[] = [];
  for (let index = 0; index * size < value.length; index += 1) {
    cookies.push({
      name: `sb-testref-auth-token.${index}`,
      value: value.slice(index * size, (index + 1) * size),
    });
  }
  return cookies;
}

const liveSession = {
  access_token: "header.payload.signature",
  refresh_token: "refresh-token-abc",
  expires_at: 1_700_000_000,
  user: { id: "user-1", user_metadata: { full_name: "Nguyễn Văn A" } },
};

/**
 * The payload auth-js actually writes from a server client: `_saveSession`
 * deletes `user` before storing when a `userStorage` adapter is configured,
 * and @supabase/ssr always configures one.
 */
const serverWrittenSession = {
  access_token: "header.payload.signature",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: 1_800_003_600,
  refresh_token: "refresh-token-abc",
};

describe("base64UrlDecode", () => {
  it("decodes unpadded base64url", () => {
    expect(base64UrlDecode("aGVsbG8")).toBe("hello");
  });

  it("decodes UTF-8 payloads (Vietnamese user metadata)", () => {
    const encoded = Buffer.from("Nguyễn Văn A", "utf8").toString("base64url");
    expect(base64UrlDecode(encoded)).toBe("Nguyễn Văn A");
  });

  it("returns null for input that is not base64url", () => {
    // "!" and the space are outside the alphabet in every decoder.
    expect(base64UrlDecode("not base64!!")).toBeNull();
  });
});

describe("resolveAuthTokenValue", () => {
  it("returns null when no auth cookie is present", () => {
    expect(resolveAuthTokenValue([])).toBeNull();
    expect(
      resolveAuthTokenValue([{ name: "theme", value: "dark" }]),
    ).toBeNull();
  });

  it("prefers the unsuffixed cookie", () => {
    expect(
      resolveAuthTokenValue([
        { name: "sb-testref-auth-token", value: "whole" },
        { name: "sb-testref-auth-token.0", value: "stale" },
      ]),
    ).toBe("whole");
  });

  it("concatenates chunks in index order", () => {
    expect(
      resolveAuthTokenValue([
        { name: "sb-testref-auth-token.1", value: "B" },
        { name: "sb-testref-auth-token.0", value: "A" },
        { name: "sb-testref-auth-token.2", value: "C" },
      ]),
    ).toBe("ABC");
  });

  it("stops at a gap instead of stitching a partial write", () => {
    // Chunk .1 never landed; joining .0 with .2 would fabricate a value.
    expect(
      resolveAuthTokenValue([
        { name: "sb-testref-auth-token.0", value: "A" },
        { name: "sb-testref-auth-token.2", value: "C" },
      ]),
    ).toBe("A");
  });

  it("ignores the PKCE code-verifier cookie", () => {
    expect(
      resolveAuthTokenValue([
        {
          name: "sb-testref-auth-token-code-verifier",
          value: "verifier",
        },
      ]),
    ).toBeNull();
  });

  it("never splices chunks from two different project refs", () => {
    // A ref change leaves the old set behind. Whatever wins, it must be one
    // coherent payload — mixing chunks would fabricate a value that was never
    // a session.
    const stale = chunked(
      encodeSession({ access_token: "old", refresh_token: "old-refresh" }),
      40,
    ).map((cookie) => ({
      ...cookie,
      name: cookie.name.replace("testref", "oldref"),
    }));
    const fresh = chunked(
      encodeSession({ access_token: "new", refresh_token: "new-refresh" }),
      40,
    );

    const resolved = resolveAuthTokenValue([...stale, ...fresh]);
    expect(resolved).not.toBeNull();

    const decoded = decodeAuthTokenValue(resolved as string);
    // Either generation may win; the guarantee is that a whole one wins.
    expect(["old-refresh", "new-refresh"]).toContain(decoded?.refresh_token);
  });
});

describe("decodeAuthTokenValue", () => {
  it("decodes a base64url-prefixed session", () => {
    expect(decodeAuthTokenValue(encodeSession(liveSession))).toMatchObject({
      refresh_token: "refresh-token-abc",
    });
  });

  it("still accepts raw JSON when cookieEncoding is not base64url", () => {
    expect(
      decodeAuthTokenValue(JSON.stringify({ expires_at: 42 })),
    ).toMatchObject({ expires_at: 42 });
  });

  it("returns null for undecodable or non-object payloads", () => {
    expect(decodeAuthTokenValue("base64-!!!not-base64!!!")).toBeNull();
    expect(decodeAuthTokenValue("base64-" + Buffer.from("hello").toString("base64url"))).toBeNull();
    expect(decodeAuthTokenValue("base64-" + Buffer.from("[1,2]").toString("base64url"))).toBeNull();
    expect(decodeAuthTokenValue("")).toBeNull();
  });
});

describe("wire format", () => {
  it("accepts the exact payload a server client writes (no `user` key)", () => {
    expect(Object.keys(serverWrittenSession)).not.toContain("user");
    expect(
      hasUsableSessionCookie(
        [
          {
            name: "sb-testref-auth-token",
            value: encodeSession(serverWrittenSession),
          },
        ],
        1_800_000_000,
      ),
    ).toBe(true);
  });

  it("matches what @supabase/ssr writes by default", () => {
    // createServerClient / createBrowserClient default to
    // `cookieEncoding: "base64url"`, storing `base64-` + the encoded session.
    const cookie = {
      name: "sb-testref-auth-token",
      value: "base64-" + stringToBase64URL(JSON.stringify(liveSession)),
    };

    expect(cookie.value).toBe(encodeSession(liveSession));
    expect(hasUsableSessionCookie([cookie], 1_800_000_000)).toBe(true);
  });
});

describe("hasUsableSessionCookie", () => {
  const NOW = 1_800_000_000;

  it("is false with no cookies", () => {
    expect(hasUsableSessionCookie([], NOW)).toBe(false);
  });

  it("accepts a live session", () => {
    expect(
      hasUsableSessionCookie(
        [
          {
            name: "sb-testref-auth-token",
            value: encodeSession({ ...liveSession, expires_at: NOW + 3600 }),
          },
        ],
        NOW,
      ),
    ).toBe(true);
  });

  it("accepts an expired access token while a refresh token survives", () => {
    // Regression guard: the normal state of any session idle longer than the
    // ~1 h access-token TTL. Treating it as signed out bounced returning users
    // off /checkout even though the next request refreshes the token.
    expect(
      hasUsableSessionCookie(
        [
          {
            name: "sb-testref-auth-token",
            value: encodeSession({ ...liveSession, expires_at: NOW - 60 }),
          },
        ],
        NOW,
      ),
    ).toBe(true);
  });

  it("rejects an expired token that has no refresh token", () => {
    expect(
      hasUsableSessionCookie(
        [
          {
            name: "sb-testref-auth-token",
            value: encodeSession({
              access_token: "a.b.c",
              expires_at: NOW - 60,
            }),
          },
        ],
        NOW,
      ),
    ).toBe(false);
  });

  it("accepts a chunked session", () => {
    const raw = encodeSession(liveSession);
    const cookies = chunked(raw, 40);
    expect(cookies.length).toBeGreaterThan(1);
    expect(hasUsableSessionCookie(cookies, NOW)).toBe(true);
  });

  it("rejects a cookie we cannot decode, instead of letting it through", () => {
    // This is the behaviour the module exists for: the previous implementation
    // returned true from its catch block for any `sb-*` cookie.
    expect(
      hasUsableSessionCookie(
        [{ name: "sb-testref-auth-token", value: "base64-@@@corrupt@@@" }],
        NOW,
      ),
    ).toBe(false);
  });

  it("rejects a truncated chunked cookie", () => {
    const cookies = chunked(encodeSession(liveSession), 40);
    expect(hasUsableSessionCookie(cookies.slice(0, 1), NOW)).toBe(false);
  });

  it("accepts a session with an access token but no refresh token or expiry", () => {
    // Loose on purpose: a false negative here locks a signed-in visitor out of
    // /checkout, while a false positive only renders a page whose own API calls
    // 401 anyway.
    expect(
      hasUsableSessionCookie(
        [
          {
            name: "sb-testref-auth-token",
            value: encodeSession({ access_token: "a.b.c" }),
          },
        ],
        NOW,
      ),
    ).toBe(true);
  });

  it("rejects valid JSON that is not a session, and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(
        hasUsableSessionCookie(
          [
            {
              name: "sb-testref-auth-token",
              value: encodeSession({ some: "other shape" }),
            },
          ],
          NOW,
        ),
      ).toBe(false);
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});
