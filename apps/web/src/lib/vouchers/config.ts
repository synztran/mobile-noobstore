import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getMaxVouchersPerOrder(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fees")
    .select("max_vouchers_per_order")
    .eq("id", 1)
    .maybeSingle();
  const value = Number(data?.max_vouchers_per_order ?? 2);
  return Math.max(1, Number.isFinite(value) ? value : 2);
}
