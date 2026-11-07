import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.error("[health] auth probe failed", authError.code);
      return NextResponse.json({ status: "degraded" });
    }

    const admin = getAdminClient();
    const [{ error: productError }, { data: fees, error: feesError }] =
      await Promise.all([
        admin.from("products").select("id").eq("is_active", true).limit(1),
        admin.from("fees").select("id").eq("id", 1).maybeSingle(),
      ]);

    if (productError || feesError || !fees) {
      console.error("[health] dependency probe failed", {
        products: productError?.code ?? "ok",
        fees: feesError?.code ?? (!fees ? "missing" : "ok"),
      });
      return NextResponse.json({ status: "degraded" });
    }

    return NextResponse.json({ status: "healthy" });
  } catch (err) {
    console.error(
      "[health] probe failed",
      err instanceof Error ? err.name : "UnknownError"
    );
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
