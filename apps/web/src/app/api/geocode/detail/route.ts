import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_KEY = process.env.GOONG_API_KEY ?? "";

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get("place_id")?.trim();
  if (!placeId) {
    return NextResponse.json({ error: "Missing place_id" }, { status: 400 });
  }

  if (!API_KEY) {
    return NextResponse.json(
      { error: "Goong API key not configured" },
      { status: 500 }
    );
  }

  try {
    const url = `https://rsapi.goong.io/Place/Detail?place_id=${placeId}&api_key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      return NextResponse.json(
        { error: data.error.message ?? "Goong Place Detail error" },
        { status: 400 }
      );
    }

    const loc = data.result?.geometry?.location;
    if (!loc) {
      return NextResponse.json({ error: "No location data" }, { status: 404 });
    }

    return NextResponse.json({
      place_name: data.result?.formatted_address ?? "",
      lat: loc.lat,
      lon: loc.lng,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
