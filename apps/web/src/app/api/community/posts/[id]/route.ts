import { getPostDetail } from "@/lib/community-server";
import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/community/posts/[id] — single published post + view-count bump.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const admin = getAdminClient();
    const { data: row } = await admin
      .from("community_posts")
      .select("id, view_count, status")
      .eq("id", id)
      .maybeSingle();

    const post = await getPostDetail(id);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Increment the view count (scope-read; never fails the response).
    if (row && row.status === "published") {
      await admin
        .from("community_posts")
        .update({ view_count: Number(row.view_count ?? 0) + 1 })
        .eq("id", id);
    }

    return NextResponse.json(post);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load post" },
      { status: 500 },
    );
  }
}