import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q") ?? "";

    const supabase = await createClient();
    let query = supabase
      .from("products")
      .select("id, name, slug, thumbnail, base_price, product_type")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(20);

    if (q.trim()) {
      query = query.ilike("name", `%${q.trim()}%`);
    }

    const excludeTypes = req.nextUrl.searchParams.get("exclude_types") ?? "";
    if (excludeTypes) {
      const types = excludeTypes.split(",").map((t) => t.trim()).filter(Boolean);
      if (types.length > 0) {
        types.forEach((t) => {
          query = query.neq("product_type", t);
        });
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
