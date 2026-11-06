import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Service-role client — bypasses RLS. Use ONLY in server-side API routes.
 * Never expose SUPABASE_SERVICE_ROLE_KEY to the client.
 *
 * `server-only` turns an accidental client-side import into a build error
 * instead of a runtime crash on an undefined env var.
 */
export function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const isSecretKey = serviceKey.startsWith("sb_secret_");
  const fetchWithCompatibleAuth: typeof fetch = async (input, init) => {
    if (!isSecretKey) return fetch(input, init);

    const headers = new Headers(init?.headers);
    // New Supabase secret keys are API keys, not JWTs. The SDK uses the
    // service key as a Bearer token by default, which PostgREST cannot decode
    // as a role JWT. Keep the secret in `apikey` and let Supabase resolve it
    // to service_role; do not send an invalid Authorization token.
    headers.set("apikey", serviceKey);
    headers.delete("Authorization");
    return fetch(input, { ...init, headers });
  };

  return createClient<Database>(supabaseUrl, serviceKey, {
    global: { fetch: fetchWithCompatibleAuth },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
