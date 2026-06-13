"use client";

import { useEffect } from "react";
import { useMap } from "@/components/ui/map";
import { calculatingBounds } from "@/lib/map";

type FitMapToBoundsProps = {
  coordinates: [number, number][];
  /** Padding in pixels around the edge of the screen so markers don't touch the border */
  padding?: number;
};

export function FitMapToBounds({
  coordinates,
  padding = 60,
}: FitMapToBoundsProps) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!isLoaded || !map || coordinates.length === 0) return;

    // Calculate the mathematical boundaries
    const bounds = calculatingBounds(coordinates);

    if (!bounds) return; // If bounds calculation failed, do nothing

    if (bounds[0][0] === bounds[1][0] && bounds[0][1] === bounds[1][1]) {
      // If both points are the same, we can't fit to bounds. Instead, just fly to that point with a default zoom.
      map.flyTo({
        center: bounds[0] as [number, number],
        zoom: 14,
        duration: 1000,
      });
      return;
    }

    // Tell MapLibre to fly to those bounds
    map.fitBounds(bounds as [[number, number], [number, number]], {
      padding,
      duration: 1000, // Smooth 1-second flying animation
      maxZoom: 15, // Prevents zooming in too uncomfortably close if the points are identical
    });
  }, [map, isLoaded, coordinates, padding]);

  return null; // This component is invisible, it just controls the camera
}
