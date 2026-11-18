import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { WarehouseDatabase } from "@/lib/supabase/database.types";

export function createWarehouseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server-side Supabase service credentials are not configured.");
  return createSupabaseClient<WarehouseDatabase>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
