"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerLabel,
  MapRoute,
  MapPopup,
  MapControls,
} from "@/components/ui/map";
import { MapPin, Store } from "lucide-react";
import { FitMapToBounds } from "./fitMapBounds";

interface IProps {
  targetLocation: {
    lat: number;
    lon: number;
    label: string;
  } | null;
  isUpdating?: boolean;
}

export default function DistanceMap({ targetLocation, isUpdating }: IProps) {
  const storeLocation = {
    // lat: process.env.NEXT_PUBLIC_STORE_LAT
    //   ? parseFloat(process.env.NEXT_PUBLIC_STORE_LAT)
    //   : 10.762622,
    // lon: process.env.NEXT_PUBLIC_STORE_LON
    //   ? parseFloat(process.env.NEXT_PUBLIC_STORE_LON)
    //   : 106.660172,
    lat: 10.833253825147002,
    lon: 106.72253749319837,
    label: "Noobstore HCM",
  };

  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>(
    []
  );
  const [drivingDistanceKm, setDrivingDistanceKm] =
    useState<string>("Calculating...");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the driving route from OSRM when the component mounts
  useEffect(() => {
    async function getDrivingRoute() {
      setIsLoading(true);
      try {
        // OSRM requires coordinates in longitude,latitude format
        const endpoint = `https://router.project-osrm.org/route/v1/driving/${storeLocation.lon},${storeLocation.lat};${targetLocation?.lon},${targetLocation?.lat}?overview=full&geometries=geojson`;

        const response = await fetch(endpoint);
        const data = await response.json();

        if (data.code === "Ok" && data.routes.length > 0) {
          const route = data.routes[0];

          // OSRM returns geometry as a GeoJSON LineString coordinate array
          setRouteCoordinates(route.geometry.coordinates);

          // OSRM returns distance in meters, convert to kilometers
          setDrivingDistanceKm((route.distance / 1000).toFixed(2));
        }
      } catch (error) {
        console.error("Failed to fetch route:", error);
        setDrivingDistanceKm("Error");
      } finally {
        setIsLoading(false);
      }
    }

    if (targetLocation) {
      getDrivingRoute();
    }
  }, [
    storeLocation.lat,
    storeLocation.lon,
    targetLocation?.lat,
    targetLocation?.lon,
  ]);

  // Find the geometric midpoint of the route to place the distance popup
  const midPoint = useMemo(() => {
    if (!targetLocation) {
      return { lon: storeLocation.lon, lat: storeLocation.lat };
    }

    if (routeCoordinates.length === 0) {
      return {
        lon: (storeLocation.lon + targetLocation?.lon) / 2,
        lat: (storeLocation.lat + targetLocation?.lat) / 2,
      };
    }
    // Grab the coordinate exactly in the middle of the array
    const middleIndex = Math.floor(routeCoordinates.length / 2);
    return {
      lon: routeCoordinates[middleIndex][0],
      lat: routeCoordinates[middleIndex][1],
    };
  }, [routeCoordinates, storeLocation, targetLocation]);

  const coordinatesToFrame: [number, number][] = useMemo(() => {
    if (!targetLocation) {
      return [[storeLocation.lon, storeLocation.lat]];
    }

    return routeCoordinates.length > 0
      ? routeCoordinates
      : [
          [storeLocation.lon, storeLocation.lat],
          [targetLocation.lon, targetLocation.lat],
        ];
  }, [routeCoordinates, storeLocation, targetLocation]);

  if (!targetLocation) {
    return null; // Don't render the map if we don't have the target location
  }

  return (
    <div className="relative h-[300px] w-full overflow-hidden rounded-xl border border-slate-200">
      <Map
        // center={[107.5, 11.3]}
        // zoom={11}
        className="h-full w-full bg-slate-100"
      >
        <FitMapToBounds coordinates={coordinatesToFrame} padding={80} />
        <MapControls position="bottom-right" showZoom showCompass />

        {/* STORE MARKER (Using a Store Icon inside a rounded badge) */}
        <MapMarker longitude={storeLocation.lon} latitude={storeLocation.lat}>
          <MarkerContent>
            <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-md transition-transform hover:scale-110">
              <Store className="h-5 w-5" />
            </div>
          </MarkerContent>
          <MarkerLabel
            position="bottom"
            className="font-semibold text-blue-900"
          >
            {storeLocation.label}
          </MarkerLabel>
        </MapMarker>

        {/* CUSTOMER MARKER (Using a MapPin Icon directly) */}
        <MapMarker longitude={targetLocation.lon} latitude={targetLocation.lat}>
          <MarkerContent>
            {/* drop-shadow makes the clean icon stand out beautifully against the map roads */}
            <MapPin className="h-8 w-8 text-red-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-transform hover:scale-110" />
          </MarkerContent>
          <MarkerLabel position="top" className="font-medium text-slate-800">
            {targetLocation.label}
          </MarkerLabel>
        </MapMarker>

        {/* Only draw the route once we have the array of road coordinates */}
        {routeCoordinates.length > 0 && (
          <MapRoute
            coordinates={routeCoordinates}
            color="#3b82f6" // Switched to a solid blue for driving routes
            width={4}
          />
        )}

        {/* <MapPopup
          longitude={midPoint.lon}
          latitude={midPoint.lat}
          closeButton={false}
          className="border-none bg-white/90 backdrop-blur-sm"
        >
          <div className="px-2 py-1 text-sm font-semibold text-slate-800">
            {isLoading ? "..." : `${drivingDistanceKm} km`}
          </div>
        </MapPopup> */}
      </Map>

      <div className="absolute bottom-4 left-4 z-10 rounded-lg border border-slate-200 bg-white/90 p-2 shadow-lg backdrop-blur-md">
        <div className="border-t border-slate-200 text-sm">
          <span className="text-slate-500">Khoảng cách tạm tính:</span>
          <span className="ml-2 font-bold text-slate-900">
            {isLoading ? "Calculating..." : `${drivingDistanceKm} km`}
          </span>
        </div>
      </div>
    </div>
  );
}
