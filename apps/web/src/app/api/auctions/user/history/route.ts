import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserBidHistory } from "@/modules/auction/server/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const history = await getUserBidHistory(user.id);
    return NextResponse.json({ history });
  } catch (err) {
    console.error("[api/auctions/user/history] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
