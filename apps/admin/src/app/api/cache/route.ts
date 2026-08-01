import { invalidateProductCaches, invalidateProductsCache } from "@/lib/redis/cache";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let scope: string | undefined;
  try {
    const body = await req.json();
    scope = body?.scope;
  } catch {
    // no body — clear everything
  }

  try {
    if (scope === "products") {
      await invalidateProductsCache();
    } else {
      await invalidateProductCaches();
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to clear cache" },
      { status: 500 }
    );
  }
}
