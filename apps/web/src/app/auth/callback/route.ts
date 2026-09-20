import { notifyNewUserRegistered } from "@/lib/telegram/telegram.service";
import { safeRedirect } from "@/modules/user/redirect";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// A newly created auth user (e.g. first Google OAuth sign-in) must land in the
// callback within seconds of its created_at. Kept generous (10 min) to absorb
// cold starts / CDN hops / clock drift while staying far below "existing
// account returning later" — so returning Google users are never re-reported.
const NEW_USER_WINDOW_MS = 600_000;

export async function GET(request: Request) {
	const requestUrl = new URL(request.url);
	const code = requestUrl.searchParams.get("code");

	if (code) {
		const supabase = await createClient();
		const { data } = await supabase.auth.exchangeCodeForSession(code);

		const user = data?.user;
		const providerMeta = user?.app_metadata ?? {};
		const providers = providerMeta.providers ?? [];
		const isGoogleProvider =
			providerMeta.provider === "google" || providers.includes("google");
		const createdMs = user?.created_at
			? Date.parse(user.created_at)
			: NaN;
		const isNew = !Number.isNaN(createdMs) &&
			Date.now() - createdMs < NEW_USER_WINDOW_MS;

		if (user && !(isGoogleProvider && isNew)) {
			console.warn("[auth-callback] skip telegram notify", {
				isGoogleProvider,
				isNew,
				elapsedMs: Number.isNaN(createdMs) ? NaN : Date.now() - createdMs,
				provider: providerMeta.provider,
				createdAt: user.created_at ?? null,
			});
		}

		// Email/password sign-ups are already reported by the register form;
		// only report brand-new Google sign-ups here (no double reporting).
		// Awaited (not fire-and-forget): on serverless hosts a promise returned
		// after the response would be terminated before the Telegram call lands.
		if (user && isGoogleProvider && isNew) {
			const meta = user.user_metadata ?? {};
			const fullName =
				String(meta.full_name ?? meta.name ?? "").trim() ||
				(user.email?.split("@")[0] ?? "Google user");
			const email = user.email ?? "";

			try {
				await notifyNewUserRegistered({
					fullName,
					email,
					registeredAt: user.created_at ?? undefined,
					provider: "google",
				});
			} catch (notifyErr) {
				// Notification failure must never break auth redirect
				console.error(
					"[auth-callback] telegram notify failed:",
					notifyErr,
				);
			}
		}
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
