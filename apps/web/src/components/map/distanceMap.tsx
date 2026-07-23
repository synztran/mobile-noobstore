"use client";

import React, { useMemo } from "react";
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerLabel,
  MapRoute,
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
  storeLocation?: {
    lat: number;
    lon: number;
    label: string;
  } | null;
  routeCoordinates?: [number, number][] | null;
  drivingDistanceKm?: string | null;
  isLoading?: boolean;
}

const DEFAULT_STORE: { lat: number; lon: number; label: string } = {
  lat: 10.762622,
  lon: 106.660172,
  label: "Noobstore HCM",
};

export default function DistanceMap({
  targetLocation,
  storeLocation,
  routeCoordinates,
  drivingDistanceKm,
  isLoading,
}: IProps) {
  const store = storeLocation ?? DEFAULT_STORE;
  const hasRoute =
    routeCoordinates && routeCoordinates.length > 0;

  const coordinatesToFrame: [number, number][] = useMemo(() => {
    if (!targetLocation) {
      return [[store.lon, store.lat]];
    }
    if (hasRoute) {
      return routeCoordinates!;
    }
    return [
      [store.lon, store.lat],
      [targetLocation.lon, targetLocation.lat],
    ];
  }, [routeCoordinates, store, targetLocation, hasRoute]);

  if (!targetLocation) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
        <p className="text-sm font-semibold text-slate-400">
          Vui lòng chọn địa chỉ giao hàng
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="relative h-[300px] w-full overflow-hidden rounded-xl border border-slate-200">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-lg">
              <span className="loading loading-spinner loading-sm" />
              <span className="text-xs font-semibold text-slate-600">Đang tải bản đồ...</span>
            </div>
          </div>
        )}
        <Map className="h-full w-full bg-slate-100">
          <FitMapToBounds coordinates={coordinatesToFrame} padding={80} />
          <MapControls position="bottom-right" showZoom showCompass />

          <MapMarker longitude={store.lon} latitude={store.lat}>
            <MarkerContent>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-md transition-transform hover:scale-110">
                <Store className="h-5 w-5" />
              </div>
            </MarkerContent>
            <MarkerLabel
              position="bottom"
              className="font-semibold text-blue-900"
            >
              {store.label}
            </MarkerLabel>
          </MapMarker>

          <MapMarker
            longitude={targetLocation.lon}
            latitude={targetLocation.lat}
          >
            <MarkerContent>
              <MapPin className="h-8 w-8 text-red-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-transform hover:scale-110" />
            </MarkerContent>
            <MarkerLabel position="top" className="font-medium text-slate-800">
              {targetLocation.label}
            </MarkerLabel>
          </MapMarker>

          {hasRoute && (
            <MapRoute
              coordinates={routeCoordinates!}
              color="#3b82f6"
              width={4}
            />
          )}
        </Map>

        <div className="absolute bottom-4 left-4 z-10 rounded-lg bg-white/90 px-2 py-1 shadow-lg backdrop-blur-md">
          <div className="text-xs">
            <span className="text-slate-500">Khoảng cách tạm tính:</span>
            <span className="ml-2 font-bold text-slate-900">
              {isLoading
                ? "Calculating..."
                : drivingDistanceKm
                  ? `${drivingDistanceKm} km`
                  : "—"}
            </span>
          </div>
        </div>
      </div>
      <small className="text-[10px] text-slate-500">
        Lưu ý: Khoảng cách có thể thay đổi tùy thuộc vào điều kiện giao thông
        thực tế.
      </small>
    </div>
  );
}
