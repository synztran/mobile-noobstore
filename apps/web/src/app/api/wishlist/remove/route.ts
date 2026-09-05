import { createClient } from "@/lib/supabase/server";
import { removeWishlistItem } from "@/modules/user/server/wishlist";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface RemoveWishlistRequest {
  productId: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<RemoveWishlistRequest>;

    if (!body.productId || typeof body.productId !== "string") {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 }
      );
    }

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

    const result = await removeWishlistItem(supabase, user.id, body.productId);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[wishlist/remove] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
