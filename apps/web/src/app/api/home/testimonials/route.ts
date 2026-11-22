import { getCache, setCache, CACHE_KEYS } from "@/lib/redis/cache";
import { getAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

// Redis caches the complete active set. The tagged Data Cache lets the admin
// app invalidate the web runtime after a testimonial mutation; route
// revalidation is a fallback when the bridge is unavailable.
export const revalidate = 1800;

export interface Testimonial {
  id: string;
  name: string | null;
  rating: number;
  text: string;
  product: string | null;
  date: string;
  image_url: string | null;
}

export interface HomeTestimonialsResponse {
  testimonials: Testimonial[];
  summary: { count: number; averageRating: number | null };
}

async function queryActiveTestimonials(): Promise<Testimonial[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("testimonials" as never)
    .select("id, name, rating, text, product, date, image_url")
    .eq("is_active" as never, true)
    .order("order" as never, { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Testimonial[];
}

const getCachedTestimonials = unstable_cache(
  queryActiveTestimonials,
  ["home-testimonials-active"],
  { revalidate: 1800, tags: ["testimonials"] }
);

export async function GET() {
  try {
    const cacheKey = CACHE_KEYS.testimonials;
    let testimonials: Testimonial[] | null = null;
    try {
      testimonials = await getCache<Testimonial[]>(cacheKey);
    } catch (error) {
      console.warn("[testimonials] Redis read failed; using Next cache", error);
    }
    if (!testimonials) {
      let sourceLoaded = false;
      try {
        testimonials = await getCachedTestimonials();
        sourceLoaded = true;
      } catch (error) {
        console.warn(
          "[testimonials] tagged cache read failed; querying source",
          error
        );
        testimonials = await queryActiveTestimonials();
        sourceLoaded = true;
      }
      if (sourceLoaded) {
        try {
          await setCache(cacheKey, testimonials);
        } catch (error) {
          console.warn("[testimonials] Redis write failed", error);
        }
      }
    }
    const active = testimonials ?? [];
    const count = active.length;
    const ratingTotal = active.reduce((sum, item) => sum + item.rating, 0);
    const payload: HomeTestimonialsResponse = {
      testimonials: active,
      summary: {
        count,
        averageRating: count ? ratingTotal / count : null,
      },
    };
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[testimonials] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
