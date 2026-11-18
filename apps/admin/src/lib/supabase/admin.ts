import "server-only";

import type { Database } from "@db-types";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS. Use ONLY in server-side pages/routes.
 * Never expose SUPABASE_SERVICE_ROLE_KEY to the client.
 *
 * `server-only` turns an accidental client-side import into a build error
 * instead of a runtime crash on an undefined env var.
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
