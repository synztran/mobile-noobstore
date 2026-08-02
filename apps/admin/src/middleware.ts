import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Lightweight session check for page routing. Reads the Supabase auth cookie
 * directly (no SDK import) so the Edge bundle stays small and page navigation
 * incurs no DB round trip. Real JWT verification happens in API routes and
 * server components via supabase.auth.getUser() / createServerClient().
 *
 * Security note: this only confirms a token is present and not yet expired for
 * routing purposes. Authorization for `/api/*` is enforced below with a real
 * `getUser()` + `users.role` check.
 */
function hasValidSession(request: NextRequest): boolean {
	try {
		const cookies = request.cookies.getAll();

		// @supabase/ssr stores session in sb-*-auth-token (or chunked as .0, .1 …)
		const sessionCookie = cookies.find(
			({ name }) =>
				name.startsWith("sb-") &&
				(name.endsWith("-auth-token") ||
					name.endsWith("-auth-token.0")),
		);

		if (!sessionCookie?.value) return false;

		let raw = sessionCookie.value;

		// Base64url-decode if the value looks base64url-encoded. Avoid Buffer for
		// Edge runtime compatibility.
		if (/^[A-Za-z0-9_-]+$/.test(raw) && raw.includes(".")) {
			try {
				const decoded = atob(
					raw.replace(/-/g, "+").replace(/_/g, "/"),
				);
				if (decoded.startsWith("{")) raw = decoded;
			} catch {
				// not base64 — use raw value
			}
		}

		const session = JSON.parse(raw) as { expires_at?: number };
		if (typeof session.expires_at !== "number") return true;
		return session.expires_at > Math.floor(Date.now() / 1000);
	} catch {
		// Cookie exists but can't be parsed (e.g. chunked, unusual encoding).
		// Let it through — server components do the real JWT validation.
		return true;
	}
}

/**
 * Copy the Set-Cookie headers that a Supabase SSR client wrote to `from` onto
 * `target`. Necessary so refreshed auth cookies reach the browser even when we
 * return a redirect / JSON error instead of the unchanged response.
 */
function carryCookies(
	target: NextResponse,
	from: NextResponse,
): NextResponse {
	from.cookies.getAll().forEach(({ name, value, ...options }) => {
		try {
			// Clear previous cookie before re-setting the same name to avoid
			// duplicate Set-Cookie headers clashing.
			target.cookies.set(name, value, options);
		} catch {
			// ignore malformed options
		}
	});
	return target;
}

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Public pages
	if (pathname === "/login" || pathname === "/unauthorized") {
		return NextResponse.next();
	}

	// External webhook: authenticated by the route's own shared-secret check.
	if (pathname === "/api/crawling/webhook") {
		return NextResponse.next();
	}

	const isApi = pathname.startsWith("/api/");

	// === Pages (non-API): cheap cookie-based routing check, like the web app ===
	// Authorization for these is verified in server components / routes. Keeps
	// Edge bundle small, avoids a DB read and a fail-closed panel lockout on
	// transient Supabase errors.
	if (!isApi) {
		if (!hasValidSession(request)) {
			const url = request.nextUrl.clone();
			url.pathname = "/login";
			url.search = "";
			return NextResponse.redirect(url);
		}
		return NextResponse.next();
	}

	// === API routes: authoritative session + role verification ===
	let supabaseResponse = NextResponse.next({ request });

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value }) =>
						request.cookies.set(name, value),
					);
					supabaseResponse = NextResponse.next({ request });
					cookiesToSet.forEach(({ name, value, options }) =>
						supabaseResponse.cookies.set(name, value, options),
					);
				},
			},
		},
	);

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return carryCookies(
			NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
			supabaseResponse,
		);
	}

	// Verify the caller is actually an admin (role lives in public.users).
	const { data: profile } = await supabase
		.from("users")
		.select("role")
		.eq("id", user.id)
		.maybeSingle();

	if (profile?.role !== "admin") {
		return carryCookies(
			NextResponse.json({ error: "Forbidden" }, { status: 403 }),
			supabaseResponse,
		);
	}

	return supabaseResponse;
}

export const config = {
	matcher: [
		// All routes except static assets. API routes are protected in-handler so
		// unauthenticated calls get JSON 401/403 instead of a redirect; pages use
		// a lightweight cookie check.
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};