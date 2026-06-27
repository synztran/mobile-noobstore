import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_KEY = process.env.GOONG_API_KEY ?? "";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  if (!API_KEY) {
    return NextResponse.json(
      { error: "Goong API key not configured" },
      { status: 500 }
    );
  }

  try {
    const url = `https://rsapi.goong.io/Place/AutoComplete?input=${encodeURIComponent(q)}&api_key=${API_KEY}&limit=5`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      return NextResponse.json(
        { error: data.error.message ?? "Goong API error" },
        { status: 400 }
      );
    }

    const features = (data.predictions ?? []).map(
      (p: { place_id: string; description: string }) => ({
        place_id: p.place_id,
        place_name: p.description,
      })
    );

    return NextResponse.json({ features });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
