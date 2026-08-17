import { getCommunityConfig, getUserPermission } from "@/lib/community-server";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/community/config
// Public config + (when authed) whether the current user may post/upload firmware.
export async function GET() {
  try {
    const config = await getCommunityConfig();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        ...config,
        can_post: false,
        can_upload_firmware: false,
        current_rank_level: null,
      });
    }

    const permission = await getUserPermission(user.id);
    return NextResponse.json({
      ...config,
      can_post: permission.canPost,
      can_upload_firmware: permission.canUploadFirmware,
      current_rank_level: permission.rankLevel,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load config" },
      { status: 500 },
    );
  }
}