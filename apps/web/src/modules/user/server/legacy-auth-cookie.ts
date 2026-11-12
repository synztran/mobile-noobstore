import "server-only";

import type { NextRequest, NextResponse } from "next/server";

export function clearLegacyAuthCookie(
  response: NextResponse,
  request: NextRequest
) {
  const configuredDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN?.replace(
    /^\./,
    ""
  ).toLowerCase();
  const requestHost = request.nextUrl.hostname.toLowerCase();
  if (
    configuredDomain !== "noobstore.xyz" ||
    (requestHost !== "noobstore.xyz" && !requestHost.endsWith(".noobstore.xyz"))
  ) {
    return;
  }

  const cookieNames = new Set(
    request.cookies
      .getAll()
      .map(({ name }) => name)
      .filter(
        (name) =>
          name.startsWith("sb-") &&
          (name.includes("-auth-token") || name.includes("-auth-token."))
      )
  );
  const freshCookieNames = new Set(
    response.cookies.getAll().map(({ name }) => name)
  );

  for (const name of cookieNames) {
    if (freshCookieNames.has(name)) continue;

    // Expire host-only variants; preserve the fresh Domain cookie Supabase set.
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
    });
  }
}
