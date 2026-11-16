"use client";

import { useMap } from "@/components/ui/map";
import type MapLibreGL from "maplibre-gl";
import { useEffect, useId } from "react";

interface AnimatedRouteProps {
  coordinates: [number, number][];
  color?: string;
  glowColor?: string;
}

export function AnimatedRoute({
  coordinates,
  color = "#2563eb",
  glowColor = "#60a5fa",
}: AnimatedRouteProps) {
  const { map, isLoaded } = useMap();
  const autoId = useId().replace(/:/g, "_");
  const sourceId = `animated-route-src-${autoId}`;
  const baseLayerId = `animated-route-base-${autoId}`;
  const pulseLayerId = `animated-route-pulse-${autoId}`;

  // 1. Add source and layers
  useEffect(() => {
    if (!isLoaded || !map) return;

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [] },
        },
      });
    }

    // Base background line (solid glowing route)
    if (!map.getLayer(baseLayerId)) {
      map.addLayer({
        id: baseLayerId,
        type: "line",
        source: sourceId,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": glowColor,
          "line-width": 6,
          "line-opacity": 0.35,
        },
      });
    }

    // Animated dashed pulse line on top
    if (!map.getLayer(pulseLayerId)) {
      map.addLayer({
        id: pulseLayerId,
        type: "line",
        source: sourceId,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": color,
          "line-width": 4,
          "line-opacity": 0.95,
          "line-dasharray": [0, 4, 3],
        },
      });
    }

    return () => {
      try {
        if (map.getLayer(pulseLayerId)) map.removeLayer(pulseLayerId);
        if (map.getLayer(baseLayerId)) map.removeLayer(baseLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        // cleanup ignore
      }
    };
  }, [isLoaded, map, sourceId, baseLayerId, pulseLayerId, color, glowColor]);

  // 2. Update coordinates GeoJSON
  useEffect(() => {
    if (!isLoaded || !map || coordinates.length < 2) return;
    const source = map.getSource(sourceId) as
      | MapLibreGL.GeoJSONSource
      | undefined;
    if (source) {
      source.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates },
      });
    }
  }, [isLoaded, map, coordinates, sourceId]);

  // 3. Drive continuous dash animation using requestAnimationFrame
  useEffect(() => {
    if (!isLoaded || !map || coordinates.length < 2) return;

    let animFrame: number;
    let step = 0;
    const dashLength = 16;

    const animateDash = () => {
      step = (step + 0.25) % dashLength;
      try {
        if (map.getLayer(pulseLayerId)) {
          // Creates a moving conveyor-belt / ant-trail dash effect towards the customer
          const newDashArray = [
            Math.max(0, step),
            4,
            Math.max(0, dashLength - step),
          ];
          map.setPaintProperty(pulseLayerId, "line-dasharray", newDashArray);
        }
      } catch {
        // layer not ready or being removed
      }
      animFrame = requestAnimationFrame(animateDash);
    };

    animFrame = requestAnimationFrame(animateDash);

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [isLoaded, map, pulseLayerId, coordinates]);

  return null;
}
