import "server-only";

import { createClient } from "@/lib/supabase/server";

export type AdminResult =
  | { ok: true; user: { id: string; email?: string }; client: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; status: 401 | 403 };

export async function requireWarehouseAdmin(): Promise<AdminResult> {
  const client = await createClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return { ok: false, status: 401 };

  const { data: profile, error } = await client
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (error || profile?.role !== "admin") return { ok: false, status: 403 };
  return { ok: true, user: { id: user.id, email: user.email }, client };
}
