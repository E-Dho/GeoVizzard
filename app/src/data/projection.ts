import type { Position } from "@deck.gl/core";

const EARTH_RADIUS_KM = 6371.0088;

export function geodesicCircle(
  centerLon: number,
  centerLat: number,
  radiusKm: number,
  steps = 48
): Position[] {
  const lat = (centerLat * Math.PI) / 180;
  const lon = (centerLon * Math.PI) / 180;
  const angular = radiusKm / EARTH_RADIUS_KM;
  const ring: Position[] = [];

  for (let i = 0; i <= steps; i += 1) {
    const bearing = (2 * Math.PI * i) / steps;
    const pointLat = Math.asin(
      Math.sin(lat) * Math.cos(angular) +
        Math.cos(lat) * Math.sin(angular) * Math.cos(bearing)
    );
    const pointLon =
      lon +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angular) * Math.cos(lat),
        Math.cos(angular) - Math.sin(lat) * Math.sin(pointLat)
      );
    ring.push([(pointLon * 180) / Math.PI, (pointLat * 180) / Math.PI]);
  }

  return ring;
}
