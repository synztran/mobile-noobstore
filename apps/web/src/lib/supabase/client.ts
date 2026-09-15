"use client";

import { createBrowserClient } from "@supabase/ssr";
import { Database } from "./database.types";

const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY =
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key";

/**
 * `.noobstore.xyz` in production so sessions survive the www ↔ m. device
 * redirect (see modules/desktop); host-scoped when unset (localhost dev).
 */
const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

export function createClient() {
	return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
		cookieOptions: { domain: COOKIE_DOMAIN },
	});
}
