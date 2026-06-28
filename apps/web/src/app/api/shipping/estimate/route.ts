import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ estimates: [] });
    }

    const { data: addr } = await supabase
      .from("user_addresses")
      .select("city, district")
      .eq("user_id", user.id)
      .eq("is_default", true)
      .maybeSingle();

    const { data: methods } = await supabase
      .from("shipping_methods")
      .select("id, name, description, estimated_hours_min, estimated_hours_max, sort_order")
      .eq("is_active", true)
      .order("sort_order");

    const estimates = (methods ?? [])
      .filter((m) => m.estimated_hours_min && m.estimated_hours_max)
      .map((m) => {
        const now = new Date();
        const minDate = new Date(now.getTime() + m.estimated_hours_min! * 60 * 60 * 1000);
        const maxDate = new Date(now.getTime() + m.estimated_hours_max! * 60 * 60 * 1000);

        return {
          id: m.id,
          name: m.name,
          description: m.description,
          estimated_hours_min: m.estimated_hours_min,
          estimated_hours_max: m.estimated_hours_max,
          estimated_date_min: minDate.toISOString(),
          estimated_date_max: maxDate.toISOString(),
        };
      });

    return NextResponse.json({
      district: addr?.district ?? null,
      city: addr?.city ?? null,
      estimates,
    });
  } catch {
    return NextResponse.json({ estimates: [] });
  }
}
