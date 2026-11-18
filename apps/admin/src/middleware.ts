import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { hasUsableSessionCookie } from "@/lib/auth/session-cookie";

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

	// The warehouse app uses a separate origin and forwards a Supabase access
	// token only to the narrow sync endpoint. Verify that identity and DB role.
	if (pathname === "/api/warehouse-sync" || pathname === "/api/warehouse-sync/stock") {
		const authorization = request.headers.get("authorization") ?? "";
		const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
		if (!token || token.length > 8192) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		const bearerClient = createServerClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
			{
				global: { headers: { Authorization: `Bearer ${token}` } },
				cookies: { getAll: () => [], setAll: () => {} },
			},
		);
		const { data: { user }, error: authError } = await bearerClient.auth.getUser(token);
		if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		const { data: profile, error: roleError } = await bearerClient
			.from("users")
			.select("role")
			.eq("id", user.id)
			.maybeSingle();
		if (roleError || profile?.role !== "admin") {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}
		return NextResponse.next({ request });
	}

	const isApi = pathname.startsWith("/api/");

	// === Pages (non-API): cheap cookie-based routing check, like the web app ===
	// Authorization for these is verified in server components / routes. Keeps
	// Edge bundle small, avoids a DB read and a fail-closed panel lockout on
	// transient Supabase errors.
	if (!isApi) {
		if (!hasUsableSessionCookie(request.cookies.getAll())) {
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
