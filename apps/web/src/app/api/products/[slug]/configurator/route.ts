import { getConfiguratorData } from "@/modules/products/server/configurator";
import type { ConfiguratorResponse } from "@/modules/products/types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─── GET /api/products/[id]/configurator ──────────────────────────────────────
//
// Thin handler: all fetching + shaping lives in
// modules/products/server/configurator.ts.

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug) {
    return NextResponse.json(
      { error: "slug is required" },
      { status: 400 }
    );
  }

  try {
    const data = await getConfiguratorData(slug);
    return NextResponse.json<ConfiguratorResponse>(data);
  } catch (err) {
    console.error("[configurator] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
