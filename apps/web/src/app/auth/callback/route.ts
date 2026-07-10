import { safeRedirect } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
	const requestUrl = new URL(request.url);
	const code = requestUrl.searchParams.get("code");

	if (code) {
		const supabase = await createClient();
		await supabase.auth.exchangeCodeForSession(code);
	}

	// Password reset passes next inside redirect_to:
	// /auth/callback?code=xxx&redirect_to=...%3Fnext%3D%2Fupdate-password
	let next = requestUrl.searchParams.get("next");
	if (!next) {
		const redirectTo = requestUrl.searchParams.get("redirect_to");
		if (redirectTo) {
			try {
				const redirectUrl = new URL(redirectTo);
				next = redirectUrl.searchParams.get("next");
			} catch {
				// invalid redirect_to — ignore
			}
		}
	}

	return NextResponse.redirect(
		new URL(
			safeRedirect(next, requestUrl.origin, "/verified-success"),
			requestUrl.origin,
		),
	);
}
