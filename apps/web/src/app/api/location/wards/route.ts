import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function nominatimSearch(q: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    q
  )}`;
  const headers: Record<string, string> = {
    "User-Agent": process.env.NOMINATIM_USER_AGENT || "noobstore/1.0",
    Accept: "application/json",
  };
  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<any>;
  if (!Array.isArray(data) || data.length === 0) return null;
  return data[0];
}

async function queryOverpass(areaId: number) {
  // Try to fetch administrative children (likely wards) inside the district area
  const query = `[out:json][timeout:25];area(${areaId})->.searchArea;(
    relation(area.searchArea)["boundary"="administrative"]["admin_level"~"9|10"];
    way(area.searchArea)["boundary"="administrative"]["admin_level"~"9|10"];
    node(area.searchArea)["place"~"suburb|neighbourhood|quarter|village|locality"];
  );out tags;`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const city = String(url.searchParams.get("city") ?? "").trim();
    const district = String(url.searchParams.get("district") ?? "").trim();

    if (!city || !district) {
      return NextResponse.json({ wards: [] });
    }

    const nom = await nominatimSearch(`${district}, ${city}, Vietnam`);
    if (!nom) {
      return NextResponse.json({ wards: [] });
    }

    const osmType = String(nom.osm_type ?? "").toLowerCase();
    const osmId = Number(nom.osm_id ?? 0);
    let areaId: number | null = null;
    if (osmType === "relation") areaId = 3600000000 + osmId;
    else if (osmType === "way") areaId = 2400000000 + osmId;

    if (!areaId) {
      return NextResponse.json({ wards: [] });
    }

    const overpass = await queryOverpass(areaId);
    if (!overpass || !Array.isArray(overpass.elements)) {
      return NextResponse.json({ wards: [] });
    }

    const names = new Set<string>();
    for (const el of overpass.elements) {
      const name = el?.tags?.name;
      if (!name) continue;
      const cleaned = String(name).trim();
      if (cleaned) names.add(cleaned);
    }

    const list = Array.from(names).sort((a, b) => a.localeCompare(b, "vi"));
    return NextResponse.json({ wards: list });
  } catch (err) {
    return NextResponse.json({ wards: [] });
  }
}
