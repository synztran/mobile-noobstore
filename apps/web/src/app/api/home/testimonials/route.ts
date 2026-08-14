import { getCache, setCache, CACHE_KEYS } from "@/lib/redis/cache";
import { getAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// Response is cached at the Next.js edge (60s) so repeat hits never run the
// handler (no middleware Redis hop, no route Redis get). Redis is a second
// layer for the first edge miss.
export const revalidate = 60;

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
    const cacheKey = CACHE_KEYS.testimonials;
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
    return NextResponse.json(testimonials ?? []);
  } catch (err) {
    console.error("[testimonials] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
