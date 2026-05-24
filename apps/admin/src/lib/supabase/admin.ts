import type { Database } from "@db-types";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS. Use ONLY in server-side pages/routes.
 * Never expose SUPABASE_SERVICE_ROLE_KEY to the client.
 */
export function getAdminClient() {
	return createClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!,
		{
			auth: {
				autoRefreshToken: false,
				persistSession: false,
			},
		},
	);
}
