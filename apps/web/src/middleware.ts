import { type NextRequest, NextResponse } from "next/server";

/**
 * Lightweight session check — reads the Supabase auth cookie directly without
 * importing the full @supabase/supabase-js SDK. This keeps middleware on the
 * Edge runtime tiny (< 2 kB vs 87 kB with the SDK).
 *
 * Security note: this only checks cookie presence/expiry for routing decisions.
 * Actual JWT verification still happens in every API route and server component
 * via supabase.auth.getUser() from the server client.
 */
function hasValidSession(request: NextRequest): boolean {
	const cookies = request.cookies.getAll();

	// @supabase/ssr stores session in sb-*-auth-token (or chunked as .0, .1 …)
	const sessionCookie = cookies.find(
		({ name }) =>
			name.startsWith("sb-") &&
			(name.endsWith("-auth-token") || name.endsWith("-auth-token.0")),
	);

	if (!sessionCookie?.value) return false;

	try {
		// Newer @supabase/ssr versions base64url-encode the JSON session object.
		// Older versions store raw JSON. Try base64 decode first, fall back to raw.
		let raw = sessionCookie.value;
		try {
			const decoded = Buffer.from(raw, "base64url").toString("utf-8");
			if (decoded.startsWith("{")) raw = decoded;
		} catch {
			// ignore — raw is already JSON
		}

		const session = JSON.parse(raw) as { expires_at?: number };
		if (typeof session.expires_at !== "number") return true; // can't check expiry, optimistically valid
		return session.expires_at > Math.floor(Date.now() / 1000);
	} catch {
		// Cookie exists but unparseable — treat as valid (server will verify properly)
		return true;
	}
}

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const isLoggedIn = hasValidSession(request);

	// Redirect unauthenticated users away from protected routes
	if (pathname.startsWith("/checkout") && !isLoggedIn) {
		const loginUrl = new URL("/login", request.url);
		loginUrl.searchParams.set("next", pathname);
		return NextResponse.redirect(loginUrl);
	}

	// Redirect authenticated users away from auth pages
	if ((pathname === "/login" || pathname === "/register") && isLoggedIn) {
		return NextResponse.redirect(new URL("/", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except:
		 * - _next/static (static files)
		 * - _next/image (image optimization)
		 * - favicon.ico
		 * - public assets
		 */
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
