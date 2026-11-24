import { type NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/auth/requireCronSecret";
import { resolveAuctionsServer } from "@/modules/auction/server/resolve";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authError = requireCronSecret(req);
  if (authError) return authError;

  try {
    const result = await resolveAuctionsServer();
    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error("[cron/resolve-auctions] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
