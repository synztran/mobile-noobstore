import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ReqBody = {
  streetAddress?: string;
  wardDistrict?: string;
  district?: string;
  ward?: string;
  city?: string;
  lat?: number;
  lon?: number;
  storeAddress?: string;
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Simple in-memory cache to avoid repeated geocoding during development
const geocodeCache = new Map<
  string,
  { lat: number; lon: number; ts: number }
>();
const GEOCODE_CACHE_TTL = 1000 * 60 * 60 * 24; // 24h

async function geocodeAddress(query: string) {
  // Check cache first
  const cached = geocodeCache.get(query);
  if (cached && Date.now() - cached.ts < GEOCODE_CACHE_TTL) {
    return { lat: cached.lat, lon: cached.lon, raw: null };
  }

  // Use OpenStreetMap Nominatim for lightweight geocoding with simple retry on 429
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      query
    )}`;
    const headers: Record<string, string> = {
      "User-Agent": process.env.NOMINATIM_USER_AGENT || "noobstore/1.0",
      Accept: "application/json",
    };

    let res: Response | null = null;
    const maxTries = 3;
    for (let i = 0; i < maxTries; i++) {
      try {
        res = await fetch(url, { headers });
      } catch (e) {
        // network error, allow retry
        res = null;
      }
      if (res && res.status === 429) {
        // backoff and retry
        const backoff = 500 * Math.pow(2, i);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      break;
    }

    if (!res || !res.ok) return null;
    const data = (await res.json()) as Array<any>;
    if (!Array.isArray(data) || data.length === 0) return null;
    const item = data[0];
    const lat = Number(item.lat);
    const lon = Number(item.lon);
    geocodeCache.set(query, { lat, lon, ts: Date.now() });
    return { lat, lon, raw: item };
  } catch (err) {
    // Network or parsing error — return null so caller can try other queries.
    console.error("geocodeAddress error", { error: err, query });
    return null;
  }
}

async function fetchGoogleDistanceKm(
  origin: string,
  destination: string,
  apiKey: string
) {
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&mode=driving&origins=${encodeURIComponent(
    origin
  )}&destinations=${encodeURIComponent(destination)}&key=${encodeURIComponent(
    apiKey
  )}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(
        "Google Distance Matrix HTTP error",
        res.status,
        res.statusText
      );
      return null;
    }

    const data = await res.json();
    if (data.status !== "OK") {
      console.warn(
        "Google Distance Matrix status",
        data.status,
        data.error_message
      );
      return null;
    }

    const element = data.rows?.[0]?.elements?.[0];
    if (!element || element.status !== "OK") {
      console.warn("Google Distance Matrix element status", element?.status);
      return null;
    }

    const distanceMeters = Number(element.distance?.value);
    if (!Number.isFinite(distanceMeters)) return null;
    return distanceMeters / 1000;
  } catch (err) {
    console.error("Google Distance Matrix request failed", err);
    return null;
  }
}

async function fetchMapboxRoute(
  originLat: number,
  originLon: number,
  destLat: number,
  destLon: number
) {
  const token = process.env.MAPBOX_TOKEN;
  if (!token) return null;

  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${originLon},${originLat};${destLon},${destLat}?geometries=geojson&overview=full&access_token=${encodeURIComponent(token)}`;
  const startedAt = Date.now();

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("Mapbox Directions HTTP error", {
        status: res.status,
        durationMs: Date.now() - startedAt,
      });
      return null;
    }

    const data = await res.json();
    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      console.warn("Mapbox Directions failed", {
        code: data.code,
        durationMs: Date.now() - startedAt,
      });
      return null;
    }

    const route = data.routes[0];
    const distanceMeters = Number(route.distance);
    const coordinates = route.geometry?.coordinates;
    if (
      !Number.isFinite(distanceMeters) ||
      !Array.isArray(coordinates) ||
      coordinates.length < 2
    ) return null;

    return {
      distanceKm: distanceMeters / 1000,
      geometry: coordinates as [number, number][],
    };
  } catch (err) {
    const errorName = err instanceof Error ? err.name : "UnknownError";
    console.error("Mapbox Directions request failed", {
      errorName,
      durationMs: Date.now() - startedAt,
    });
    return null;
  }
}

export async function POST(req: Request) {
  let body: ReqBody | null = null;
  try {
    body = (await req.json()) as ReqBody;

    let lat = body.lat;
    let lon = body.lon;

    // Collect all queries we attempt for debugging
    const allQueries: string[] = [];

    // First try: full street + wardDistrict + city
    if ((lat === undefined || lon === undefined) && body.streetAddress) {
      const q = `${body.streetAddress}${body.wardDistrict ? ", " + body.wardDistrict : ""}${body.city ? ", " + body.city : ""}, Vietnam`;
      allQueries.push(q);
      const geo = await geocodeAddress(q);
      if (geo) {
        lat = geo.lat;
        lon = geo.lon;
      }
    }

    // Try several geocoding query combinations to improve hit rate.
    if (
      (lat === undefined || lon === undefined) &&
      (body.streetAddress || body.district || body.ward || body.wardDistrict)
    ) {
      const street = body.streetAddress?.trim();
      const ward = body.ward?.trim();
      const district = body.district?.trim() || body.wardDistrict?.trim();
      const city = body.city?.trim();

      const attemptedQueries: Array<any> = [];
      const queries: string[] = [];
      if (street && ward && district && city)
        queries.push(`${street}, ${ward}, ${district}, ${city}, Vietnam`);
      if (street && district && city)
        queries.push(`${street}, ${district}, ${city}, Vietnam`);
      if (street && ward && city)
        queries.push(`${street}, ${ward}, ${city}, Vietnam`);
      if (street && district) queries.push(`${street}, ${district}, Vietnam`);
      if (street && city) queries.push(`${street}, ${city}, Vietnam`);
      if (district && city) queries.push(`${district}, ${city}, Vietnam`);
      if (ward && district && city)
        queries.push(`${ward}, ${district}, ${city}, Vietnam`);
      if (district && city) queries.push(`${district}, ${city}, Vietnam`);
      if (city) queries.push(`${city}, Vietnam`);

      for (const q of queries) {
        try {
          if (!allQueries.includes(q)) allQueries.push(q);
          const geo = await geocodeAddress(q);
          attemptedQueries.push({
            query: q,
            result: geo ? { lat: geo.lat, lon: geo.lon } : null,
          });
          if (geo) {
            lat = geo.lat;
            lon = geo.lon;
            break;
          }
        } catch (err) {
          // geocodeAddress now handles its own errors, but keep safety here
          console.error("geocode loop error", err, q);
          attemptedQueries.push({ query: q, error: String(err) });
        }
      }

      if (lat === undefined || lon === undefined) {
        return NextResponse.json(
          {
            error: "Could not resolve coordinates for provided address",
            queries: allQueries,
            attempts: attemptedQueries,
            received: body,
          },
          { status: 400 }
        );
      }
    }

    if (lat === undefined || lon === undefined) {
      return NextResponse.json(
        {
          error: "Could not resolve coordinates for provided address",
          queries: allQueries,
          received: body,
        },
        { status: 400 }
      );
    }

    // Determine store coordinates:
    // 1) prefer explicit env STORE_LAT/STORE_LON
    // 2) then try env STORE_ADDRESS or request body.storeAddress via geocoding
    // 3) fallback to defaults (HCMC center)
    let storeLat: number | undefined = undefined;
    let storeLon: number | undefined = undefined;

    if (process.env.STORE_LAT && process.env.STORE_LON) {
      const pLat = Number(process.env.STORE_LAT);
      const pLon = Number(process.env.STORE_LON);
      if (!Number.isNaN(pLat) && !Number.isNaN(pLon)) {
        storeLat = pLat;
        storeLon = pLon;
      }
    }

    if (storeLat === undefined || storeLon === undefined) {
      const storeQuery =
        (body.storeAddress?.trim() || process.env.STORE_ADDRESS?.trim()) ??
        null;
      if (storeQuery) {
        const cacheKey = `store:${storeQuery}`;
        const cached = geocodeCache.get(cacheKey);
        if (cached && Date.now() - cached.ts < GEOCODE_CACHE_TTL) {
          storeLat = cached.lat;
          storeLon = cached.lon;
        } else {
          const geoStore = await geocodeAddress(storeQuery);
          if (geoStore) {
            storeLat = geoStore.lat;
            storeLon = geoStore.lon;
            geocodeCache.set(cacheKey, {
              lat: storeLat,
              lon: storeLon,
              ts: Date.now(),
            });
          } else {
            console.warn("Could not geocode store address", storeQuery);
          }
        }
      }
    }

    if (storeLat === undefined || storeLon === undefined) {
      storeLat = Number(process.env.STORE_LAT ?? "10.762622");
      storeLon = Number(process.env.STORE_LON ?? "106.660172");
    }

    // Start with straight-line distance as a fallback.
    let distanceKm = haversineKm(storeLat, storeLon, Number(lat), Number(lon));
    let routeGeometry: [number, number][] = [];
    let routingMethod = "haversine_fallback";
    let routingStatus = "OK";

    // 1. Try Google Distance Matrix if API key is configured (distance only).
    const googleKey = process.env.GOOGLE_DISTANCE_MATRIX_API_KEY;
    if (googleKey) {
      const origin = `${storeLat},${storeLon}`;
      const destination = `${Number(lat)},${Number(lon)}`;
      const googleDistance = await fetchGoogleDistanceKm(
        origin,
        destination,
        googleKey
      );
      if (googleDistance !== null) {
        distanceKm = googleDistance;
        routingMethod = "google_maps";
      } else {
        routingStatus = "GOOGLE_FAILED_TRYING_OSRM";
      }
    }

    // 2. Fetch Mapbox route geometry (and distance if Google failed).
    const mapboxRoute = await fetchMapboxRoute(
      storeLat,
      storeLon,
      Number(lat),
      Number(lon)
    );
    if (mapboxRoute !== null) {
      routeGeometry = mapboxRoute.geometry;
      if (routingMethod === "haversine_fallback") {
        distanceKm = mapboxRoute.distanceKm;
        routingMethod = "mapbox_driving";
        routingStatus = "OK";
      }
    } else if (routingMethod === "haversine_fallback") {
      routingStatus = "ALL_ROUTING_FAILED_USING_FALLBACK";
    }

    // Pricing config (server-side envs)
    const includedKm = Number(process.env.DISTANCE_INCLUDED_KM ?? "5");
    const perKm = Number(process.env.DISTANCE_PER_KM ?? "2500");

    const extraKm = Math.max(0, distanceKm - includedKm);
    const extraFee = Math.round(extraKm * perKm);

    return NextResponse.json({
      distance_km: Number(distanceKm.toFixed(2)),
      extra_fee: extraFee,
      lat: Number(lat),
      lon: Number(lon),
      store_lat: storeLat,
      store_lon: storeLon,
      route_geometry: routeGeometry,
      routing_method: routingMethod,
      routing_status: routingStatus,
    });
  } catch (err) {
    console.error("/api/shipping/distance error", err, { body });
    return NextResponse.json(
      { error: String(err ?? "Internal error"), received: body },
      { status: 500 }
    );
  }
}
