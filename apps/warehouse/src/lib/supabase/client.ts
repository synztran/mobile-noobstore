"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { WarehouseDatabase } from "@/lib/supabase/database.types";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase public environment is not configured.");
  return createBrowserClient<WarehouseDatabase>(url, key);
}
