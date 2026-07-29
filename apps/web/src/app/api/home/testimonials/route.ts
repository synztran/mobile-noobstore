import { getCache, setCache, CACHE_VERSION } from "@/lib/redis/cache";
import { getAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface Testimonial {
  id: string;
  name: string;
  rating: number;
  text: string;
  product: string;
  date: string;
}

export async function GET() {
  try {
    const cacheKey = `${CACHE_VERSION}:testimonials`;
    console.log("cacheKey", cacheKey)
    const cached = await getCache<Testimonial[]>(cacheKey);
    if (cached) return NextResponse.json(cached);

    const admin = getAdminClient();

    const { data: testimonials, error } = await admin
      .from("testimonials" as never)
      .select("id, name, rating, text, product, date")
      .eq("is_active" as never, true)
      .order("order" as never, { ascending: true })
      .limit(20);

    if (error) {
      console.error("[testimonials] query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch testimonials" },
        { status: 500 }
      );
    }

    await setCache(cacheKey, testimonials ?? []);
    return NextResponse.json(testimonials ?? [], {
      headers: {
        "Cache-Control":
          "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    console.error("[testimonials] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
