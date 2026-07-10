import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const search = (sp.get("search") ?? "").trim();
  const status = sp.get("status") ?? "";

  const supabase = getAdminClient();

  let query = supabase
    .from("blog_posts")
    .select("*", { count: "exact", head: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (search) {
    query = query.or(`title.ilike.%${search}%,slug.ilike.%${search}%`);
  }

  if (status === "published") {
    query = query.eq("published", true);
  } else if (status === "draft") {
    query = query.eq("published", false);
  }

  const { data: posts, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: posts, count });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = getAdminClient();

  const payload = {
    slug: body.slug?.trim()?.toLowerCase()?.replace(/\s+/g, "-") ?? "",
    title: body.title?.trim() ?? "",
    content: body.content ?? "",
    excerpt: body.excerpt?.trim() ?? null,
    category: body.category?.trim() ?? "Uncategorized",
    author: body.author?.trim() ?? "NoobStore",
    thumbnail: body.thumbnail?.trim() || null,
    meta_title: body.meta_title?.trim() ?? null,
    meta_description: body.meta_description?.trim() ?? null,
    og_image: body.og_image?.trim() || null,
    tags: Array.isArray(body.tags) ? body.tags : [],
    published: Boolean(body.published),
    featured: Boolean(body.featured),
    published_at: body.published_at || null,
  };

  if (!payload.slug || !payload.title || !payload.content) {
    return NextResponse.json(
      { error: "slug, title and content are required" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("blog_posts").insert(payload);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
