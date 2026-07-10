import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await req.json();
  const supabase = getAdminClient();

  const sanitized: Record<string, unknown> = {};

  const stringFields = [
    "slug", "title", "content", "excerpt", "category", "author",
    "thumbnail", "meta_title", "meta_description", "og_image",
  ] as const;

  for (const field of stringFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      sanitized[field] = body[field]?.trim() ?? null;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "tags")) {
    sanitized.tags = Array.isArray(body.tags) ? body.tags : [];
  }

  if (Object.prototype.hasOwnProperty.call(body, "published")) {
    sanitized.published = Boolean(body.published);
  }

  if (Object.prototype.hasOwnProperty.call(body, "featured")) {
    sanitized.featured = Boolean(body.featured);
  }

  if (Object.prototype.hasOwnProperty.call(body, "published_at")) {
    sanitized.published_at = body.published_at || null;
  }

  if (Object.keys(sanitized).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("blog_posts")
    .update(sanitized as any)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = getAdminClient();

  const { error } = await supabase
    .from("blog_posts")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
