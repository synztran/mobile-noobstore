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

	const next = safeRedirect(
		requestUrl.searchParams.get("next"),
		requestUrl.origin
	);
	return NextResponse.redirect(new URL(next, requestUrl.origin));
}
