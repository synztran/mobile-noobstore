import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { CACHE_KEYS, invalidateCache } from "@web-cache";
import { invalidateCacheByPattern } from "@/lib/redis/cache";
import { parseTestimonialInput } from "../validation";

export const dynamic = "force-dynamic";

async function authorize() {
  const session = await createClient();
  const {
    data: { user },
    error,
  } = await session.auth.getUser();
  if (error || !user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const { data: profile, error: profileError } = await session
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || profile?.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { user };
}

async function invalidateHomeTestimonials() {
  try {
    await invalidateCache(CACHE_KEYS.testimonials);
  } catch (error) {
    console.warn("[admin/testimonials] cache invalidation failed", error);
  }
  try {
    await invalidateCacheByPattern("v2:testimonials*");
  } catch (error) {
    console.warn("[admin/testimonials] cache sweep failed", error);
  }
  const secret = process.env.NOTIFICATION_INTERNAL_SECRET;
  const baseUrl = process.env.WEB_APP_URL;
  if (!secret || !baseUrl) return;
  try {
    const response = await fetch(
      `${baseUrl.replace(/\/$/, "")}/api/cache/revalidate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": secret,
        },
        body: JSON.stringify({ tags: ["testimonials"] }),
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!response.ok) {
      console.warn(
        `[admin/testimonials] web cache revalidation returned ${response.status}`
      );
    }
  } catch (error) {
    console.warn("[admin/testimonials] web cache revalidation failed", error);
  }
}

const columns =
  'id, name, rating, text, product, date, image_url, is_active, "order", created_at, updated_at';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize();
  if ("error" in auth) return auth.error;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseTestimonialInput(body, true);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  try {
    const { id } = await params;
    const { data, error } = await (getAdminClient() as any)
      .from("testimonials")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(columns)
      .maybeSingle();
    if (error) throw error;
    if (!data)
      return NextResponse.json(
        { error: "Testimonial not found" },
        { status: 404 }
      );
    await invalidateHomeTestimonials();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[admin/testimonials] update failed", error);
    return NextResponse.json(
      { error: "Unable to update testimonial" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize();
  if ("error" in auth) return auth.error;
  try {
    const { id } = await params;
    const { data, error } = await (getAdminClient() as any)
      .from("testimonials")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data)
      return NextResponse.json(
        { error: "Testimonial not found" },
        { status: 404 }
      );
    await invalidateHomeTestimonials();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/testimonials] delete failed", error);
    return NextResponse.json(
      { error: "Unable to delete testimonial" },
      { status: 500 }
    );
  }
}
