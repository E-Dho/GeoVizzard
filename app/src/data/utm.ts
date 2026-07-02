import proj4 from "proj4";
import type { SampleRecord } from "./schema";

export type UtmInfo = {
  zone: number;
  hemisphere: "N" | "S";
  epsg: number;
  label: string;
  proj: string;
};

export type UtmViewState = {
  target: [number, number, number];
  zoom: number;
};

export type UtmGeographicBounds = {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
};

export type UtmContextLine = {
  id: string;
  path: [number, number][];
  kind: "graticule" | "frame" | "land" | "border";
};

export type UtmContextLabel = {
  id: string;
  position: [number, number];
  text: string;
};

export type UtmContext = {
  lines: UtmContextLine[];
  labels: UtmContextLabel[];
  bounds: UtmGeographicBounds;
};

export type ProjectedUtmData = {
  info: UtmInfo;
  samples: SampleRecord[];
  selectedSample?: SampleRecord;
  viewState: UtmViewState;
  context: UtmContext;
};

const WGS84 = "EPSG:4326";

function clampZone(zone: number) {
  return Math.max(1, Math.min(60, zone));
}

function utmInfo(lon: number, lat: number): UtmInfo {
  const zone = clampZone(Math.floor((lon + 180) / 6) + 1);
  const hemisphere = lat >= 0 ? "N" : "S";
  const epsg = (hemisphere === "N" ? 32600 : 32700) + zone;
  const south = hemisphere === "S" ? " +south" : "";
  return {
    zone,
    hemisphere,
    epsg,
    label: `UTM Zone ${zone}${hemisphere} / EPSG:${epsg}`,
    proj: `+proj=utm +zone=${zone}${south} +datum=WGS84 +units=m +no_defs`
  };
}

function projectLonLat(projector: proj4.Converter, lon: number, lat: number) {
  return projector.forward([lon, lat]) as [number, number];
}

function projectSample(sample: SampleRecord, projector: proj4.Converter): SampleRecord {
  const [trueX, trueY] = projectLonLat(projector, sample.true_lon, sample.true_lat);
  const [predX, predY] = projectLonLat(projector, sample.pred_lon, sample.pred_lat);
  const neighbors = sample.neighbors?.map((neighbor) => {
    if (neighbor.lon === undefined || neighbor.lat === undefined) return neighbor;
    const [lon, lat] = projectLonLat(projector, neighbor.lon, neighbor.lat);
    return { ...neighbor, lon, lat };
  });
  return {
    ...sample,
    true_lon: trueX,
    true_lat: trueY,
    pred_lon: predX,
    pred_lat: predY,
    neighbors
  };
}

function centroid(samples: SampleRecord[]) {
  let lonSum = 0;
  let latSum = 0;
  let count = 0;
  samples.forEach((sample) => {
    lonSum += sample.true_lon + sample.pred_lon;
    latSum += sample.true_lat + sample.pred_lat;
    count += 2;
  });
  return { lon: lonSum / count, lat: latSum / count };
}

function geographicBounds(samples: SampleRecord[]): UtmGeographicBounds {
  const lons = samples.flatMap((sample) => [sample.true_lon, sample.pred_lon]);
  const lats = samples.flatMap((sample) => [sample.true_lat, sample.pred_lat]);
  return {
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats)
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function niceDegreeStep(span: number) {
  const target = span / 6;
  const steps = [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 45];
  return steps.find((step) => step >= target) ?? 45;
}

function formatCoordinate(value: number, axis: "lon" | "lat") {
  const direction = axis === "lon" ? (value < 0 ? "W" : "E") : value < 0 ? "S" : "N";
  const abs = Math.abs(value);
  const precision = abs < 10 && abs % 1 !== 0 ? 2 : abs % 1 !== 0 ? 1 : 0;
  return `${abs.toFixed(precision)}°${direction}`;
}

function lineRange(start: number, end: number, segments: number) {
  return Array.from({ length: segments + 1 }, (_, index) => start + ((end - start) * index) / segments);
}

function buildUtmContext(samples: SampleRecord[], projector: proj4.Converter): UtmContext {
  const bounds = geographicBounds(samples);
  const lonSpan = Math.max(0.25, bounds.maxLon - bounds.minLon);
  const latSpan = Math.max(0.25, bounds.maxLat - bounds.minLat);
  const minLon = clamp(bounds.minLon - lonSpan * 0.12, -180, 180);
  const maxLon = clamp(bounds.maxLon + lonSpan * 0.12, -180, 180);
  const minLat = clamp(bounds.minLat - latSpan * 0.12, -80, 84);
  const maxLat = clamp(bounds.maxLat + latSpan * 0.12, -80, 84);
  const step = niceDegreeStep(Math.max(maxLon - minLon, maxLat - minLat));
  const lonStart = Math.ceil(minLon / step) * step;
  const latStart = Math.ceil(minLat / step) * step;
  const lines: UtmContextLine[] = [];
  const labels: UtmContextLabel[] = [];
  const latSamples = lineRange(minLat, maxLat, 36);
  const lonSamples = lineRange(minLon, maxLon, 36);
  let index = 0;

  for (let lon = lonStart; lon <= maxLon + step * 0.001; lon += step) {
    const roundedLon = Number(lon.toFixed(6));
    lines.push({
      id: `utm-meridian-${index}`,
      kind: "graticule",
      path: latSamples.map((lat) => projectLonLat(projector, roundedLon, lat))
    });
    labels.push({
      id: `utm-meridian-label-${index}`,
      position: projectLonLat(projector, roundedLon, minLat),
      text: formatCoordinate(roundedLon, "lon")
    });
    index += 1;
  }

  for (let lat = latStart; lat <= maxLat + step * 0.001; lat += step) {
    const roundedLat = Number(lat.toFixed(6));
    lines.push({
      id: `utm-parallel-${index}`,
      kind: "graticule",
      path: lonSamples.map((lon) => projectLonLat(projector, lon, roundedLat))
    });
    labels.push({
      id: `utm-parallel-label-${index}`,
      position: projectLonLat(projector, minLon, roundedLat),
      text: formatCoordinate(roundedLat, "lat")
    });
    index += 1;
  }

  lines.push({
    id: "utm-visible-frame",
    kind: "frame",
    path: [
      projectLonLat(projector, minLon, minLat),
      projectLonLat(projector, maxLon, minLat),
      projectLonLat(projector, maxLon, maxLat),
      projectLonLat(projector, minLon, maxLat),
      projectLonLat(projector, minLon, minLat)
    ]
  });

  return { lines, labels, bounds: { minLon, maxLon, minLat, maxLat } };
}

function fitViewState(samples: SampleRecord[]): UtmViewState {
  const xs = samples.flatMap((sample) => [sample.true_lon, sample.pred_lon]);
  const ys = samples.flatMap((sample) => [sample.true_lat, sample.pred_lat]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = Math.max(1000, maxX - minX);
  const height = Math.max(1000, maxY - minY);
  const scale = Math.min(850 / width, 620 / height);
  return {
    target: [(minX + maxX) / 2, (minY + maxY) / 2, 0],
    zoom: Math.log2(Math.max(0.00005, scale))
  };
}

export function projectSamplesToUtm(
  samples: SampleRecord[],
  selectedSample?: SampleRecord
): ProjectedUtmData | undefined {
  if (!samples.length) return undefined;
  const center = centroid(samples);
  const info = utmInfo(center.lon, center.lat);
  const projector = proj4(WGS84, info.proj);
  const projectedSamples = samples.map((sample) => projectSample(sample, projector));
  return {
    info,
    samples: projectedSamples,
    selectedSample: selectedSample ? projectSample(selectedSample, projector) : undefined,
    viewState: fitViewState(projectedSamples),
    context: buildUtmContext(samples, projector)
  };
}
