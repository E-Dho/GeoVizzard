import proj4 from "proj4";
import type { UtmGeographicBounds, UtmInfo, UtmContextLine } from "./utm";

const WGS84 = "EPSG:4326";
const LAND_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson";
const BORDERS_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_boundary_lines_land.geojson";

type LonLat = [number, number, ...number[]];

type LineStringGeometry = {
  type: "LineString";
  coordinates: LonLat[];
};

type MultiLineStringGeometry = {
  type: "MultiLineString";
  coordinates: LonLat[][];
};

type PolygonGeometry = {
  type: "Polygon";
  coordinates: LonLat[][];
};

type MultiPolygonGeometry = {
  type: "MultiPolygon";
  coordinates: LonLat[][][];
};

type SupportedGeometry =
  | LineStringGeometry
  | MultiLineStringGeometry
  | PolygonGeometry
  | MultiPolygonGeometry;

type GeoJsonFeature = {
  type: "Feature";
  geometry: SupportedGeometry | null;
};

type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

export type NaturalEarthContext = {
  land: GeoJsonFeatureCollection;
  borders: GeoJsonFeatureCollection;
};

async function fetchGeoJson(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Unable to load UTM vector context: ${response.status}`);
  }
  return (await response.json()) as GeoJsonFeatureCollection;
}

export async function loadNaturalEarthContext(signal?: AbortSignal): Promise<NaturalEarthContext> {
  const [land, borders] = await Promise.all([
    fetchGeoJson(LAND_URL, signal),
    fetchGeoJson(BORDERS_URL, signal)
  ]);
  return { land, borders };
}

function paddedBounds(bounds: UtmGeographicBounds): UtmGeographicBounds {
  const lonPad = Math.max(1, (bounds.maxLon - bounds.minLon) * 0.35);
  const latPad = Math.max(1, (bounds.maxLat - bounds.minLat) * 0.35);
  return {
    minLon: Math.max(-180, bounds.minLon - lonPad),
    maxLon: Math.min(180, bounds.maxLon + lonPad),
    minLat: Math.max(-80, bounds.minLat - latPad),
    maxLat: Math.min(84, bounds.maxLat + latPad)
  };
}

function coordinatesOverlapBounds(coordinates: LonLat[], bounds: UtmGeographicBounds) {
  if (coordinates.length < 2) return false;
  const lons = coordinates.map(([lon]) => lon);
  const lats = coordinates.map(([, lat]) => lat);
  return !(
    Math.max(...lons) < bounds.minLon ||
    Math.min(...lons) > bounds.maxLon ||
    Math.max(...lats) < bounds.minLat ||
    Math.min(...lats) > bounds.maxLat
  );
}

function projectedPath(
  coordinates: LonLat[],
  projector: proj4.Converter
): [number, number][] {
  return coordinates.map(([lon, lat]) => projector.forward([lon, lat]) as [number, number]);
}

function addPath(
  paths: UtmContextLine[],
  id: string,
  kind: "land" | "border",
  coordinates: LonLat[],
  projector: proj4.Converter,
  bounds: UtmGeographicBounds
) {
  if (!coordinatesOverlapBounds(coordinates, bounds)) return;
  paths.push({
    id,
    kind,
    path: projectedPath(coordinates, projector)
  });
}

function addGeometryPaths(
  paths: UtmContextLine[],
  prefix: string,
  kind: "land" | "border",
  geometry: SupportedGeometry | null,
  projector: proj4.Converter,
  bounds: UtmGeographicBounds
) {
  if (!geometry) return;

  if (geometry.type === "LineString") {
    addPath(paths, prefix, kind, geometry.coordinates, projector, bounds);
  } else if (geometry.type === "MultiLineString") {
    geometry.coordinates.forEach((line, index) => {
      addPath(paths, `${prefix}-${index}`, kind, line, projector, bounds);
    });
  } else if (geometry.type === "Polygon") {
    geometry.coordinates.forEach((ring, index) => {
      addPath(paths, `${prefix}-${index}`, kind, ring, projector, bounds);
    });
  } else if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach((polygon, polygonIndex) => {
      polygon.forEach((ring, ringIndex) => {
        addPath(paths, `${prefix}-${polygonIndex}-${ringIndex}`, kind, ring, projector, bounds);
      });
    });
  }
}

function projectFeatureCollection(
  collection: GeoJsonFeatureCollection,
  kind: "land" | "border",
  projector: proj4.Converter,
  bounds: UtmGeographicBounds
) {
  const paths: UtmContextLine[] = [];
  collection.features.forEach((feature, index) => {
    addGeometryPaths(paths, `utm-${kind}-${index}`, kind, feature.geometry, projector, bounds);
  });
  return paths;
}

export function projectNaturalEarthContextToUtm(
  context: NaturalEarthContext,
  info: UtmInfo,
  bounds: UtmGeographicBounds
) {
  const projector = proj4(WGS84, info.proj);
  const contextBounds = paddedBounds(bounds);
  return [
    ...projectFeatureCollection(context.land, "land", projector, contextBounds),
    ...projectFeatureCollection(context.borders, "border", projector, contextBounds)
  ];
}
