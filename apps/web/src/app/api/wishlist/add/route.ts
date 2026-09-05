import { createClient } from "@/lib/supabase/server";
import { addWishlistItem } from "@/modules/user/server/wishlist";
import type { AddWishlistRequest, AddWishlistResponse } from "@/modules/user/types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<AddWishlistRequest>;

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

    const result = await addWishlistItem(supabase, user.id, body.productId);

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      wishlistId: result.id,
    } satisfies AddWishlistResponse);
  } catch (err) {
    console.error("[wishlist/add] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
