"use client";

import dynamic from "next/dynamic";
import { Suspense, memo } from "react";

const DistanceMap = dynamic(() => import("@/components/map/distanceMap"), {
  ssr: false,
});

interface Props {
  customerLocation: { lat: number; lon: number; label: string } | null;
  storeCoords: { lat: number; lon: number } | null;
  routeCoordinates: [number, number][];
  distanceKm: number | null;
  isCalculatingFee: boolean;
}

function ShippingDistanceMap({
  customerLocation,
  storeCoords,
  routeCoordinates,
  distanceKm,
  isCalculatingFee,
}: Props) {
  return (
    <Suspense
      fallback={
        <div className="h-48 w-full animate-pulse rounded-2xl bg-surface-container-low" />
      }
    >
      <DistanceMap
        targetLocation={customerLocation}
        storeLocation={
          storeCoords ? { ...storeCoords, label: "Noobstore HCM" } : null
        }
        routeCoordinates={routeCoordinates}
        drivingDistanceKm={distanceKm !== null ? distanceKm.toFixed(1) : null}
        isLoading={isCalculatingFee}
      />
    </Suspense>
  );
}

export default memo(ShippingDistanceMap);
