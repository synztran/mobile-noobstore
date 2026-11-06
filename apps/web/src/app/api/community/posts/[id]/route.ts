import { getPostDetail } from "@/lib/community-server";
import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/community/posts/[id] — single published post + view-count bump.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = getAdminClient();
    const post = await getPostDetail(id);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Atomic increment avoids lost updates under concurrent reads.
    await admin.rpc("increment_community_post_view_count", {
      p_post_id: id,
    });

    return NextResponse.json(post);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load post" },
      { status: 500 }
    );
  }
}
