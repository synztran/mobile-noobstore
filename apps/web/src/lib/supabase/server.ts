import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/**
 * Cookie domain for auth sessions. In production this is `.noobstore.xyz` so
 * the session survives the www ↔ m. device redirect (see modules/desktop).
 * Leave unset in dev — cookies then stay host-scoped for localhost.
 */
const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

export async function createClient() {
	const cookieStore = await cookies();

	return createServerClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL ??
			"https://placeholder.supabase.co",
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key",
		{
			cookieOptions: { domain: COOKIE_DOMAIN },
			cookies: {
				getAll() {
					return cookieStore.getAll();
				},
				setAll(cookiesToSet) {
					try {
						cookiesToSet.forEach(({ name, value, options }) =>
							cookieStore.set(name, value, options),
						);
					} catch {
						// setAll called from a Server Component — safe to ignore
					}
				},
			},
		},
	);
}
