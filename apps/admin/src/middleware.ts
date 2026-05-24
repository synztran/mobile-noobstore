import { type NextRequest, NextResponse } from "next/server";

function hasValidSession(request: NextRequest): boolean {
	const cookies = request.cookies.getAll();

	const sessionCookie = cookies.find(
		({ name }) =>
			name.startsWith("sb-") &&
			(name.endsWith("-auth-token") || name.endsWith("-auth-token.0")),
	);

	if (!sessionCookie?.value) return false;

	try {
		let raw = sessionCookie.value;
		try {
			const decoded = Buffer.from(raw, "base64url").toString("utf-8");
			if (decoded.startsWith("{")) raw = decoded;
		} catch {
			// raw may already be JSON
		}

		const session = JSON.parse(raw) as { expires_at?: number };
		if (typeof session.expires_at !== "number") return true;
		return session.expires_at > Math.floor(Date.now() / 1000);
	} catch {
		return true;
	}
}

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const isLoggedIn = hasValidSession(request);

	// Allow public routes
	if (pathname === "/login" || pathname === "/unauthorized") {
		return NextResponse.next();
	}

	if (!isLoggedIn) {
		return NextResponse.redirect(new URL("/login", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
