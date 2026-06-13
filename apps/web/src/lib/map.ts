export const calculatingBounds = (coords: [number, number][]) => {
  if (coords.length === 0) {
    return [
      [0, 0],
      [0, 0],
    ]; // Fallback
  }

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }

  return [
    [minLng, minLat], // South-West corner
    [maxLng, maxLat], // North-East corner
  ];
};
