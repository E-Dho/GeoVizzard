import type { SampleRecord } from "./schema";

export type CoordinateBasis = "true" | "predicted" | "either";

export type NumericRange = {
  min?: number;
  max?: number;
};

export type Filters = {
  groups: string[];
  sequencingTypes: string[];
  sigmaFinal: NumericRange;
  errorKm: NumericRange;
  alphaPrecision: NumericRange;
  bbox: {
    enabled: boolean;
    minLon: number;
    maxLon: number;
    minLat: number;
    maxLat: number;
    basis: CoordinateBasis;
  };
  search: string;
  selectedOnly: boolean;
};

export const defaultFilters: Filters = {
  groups: [],
  sequencingTypes: [],
  sigmaFinal: {},
  errorKm: {},
  alphaPrecision: {},
  bbox: {
    enabled: false,
    minLon: -12,
    maxLon: 38,
    minLat: 34,
    maxLat: 72,
    basis: "true"
  },
  search: "",
  selectedOnly: false
};

function inRange(value: number | undefined, range: NumericRange) {
  if (value === undefined) return true;
  if (range.min !== undefined && value < range.min) return false;
  if (range.max !== undefined && value > range.max) return false;
  return true;
}

function pointInBbox(lon: number, lat: number, bbox: Filters["bbox"]) {
  return lon >= bbox.minLon && lon <= bbox.maxLon && lat >= bbox.minLat && lat <= bbox.maxLat;
}

export function applyFilters(
  samples: SampleRecord[],
  filters: Filters,
  selectedSampleId?: string
) {
  const search = filters.search.trim().toLowerCase();
  return samples.filter((sample) => {
    if (filters.selectedOnly && selectedSampleId && sample.sample_id !== selectedSampleId) {
      return false;
    }
    if (filters.groups.length && (!sample.group || !filters.groups.includes(sample.group))) {
      return false;
    }
    if (
      filters.sequencingTypes.length &&
      (!sample.sequencing_type || !filters.sequencingTypes.includes(sample.sequencing_type))
    ) {
      return false;
    }
    if (!inRange(sample.sigma_final, filters.sigmaFinal)) return false;
    if (!inRange(sample.error_km, filters.errorKm)) return false;
    if (!inRange(sample.alpha_precision, filters.alphaPrecision)) return false;
    if (search) {
      const haystack = [sample.sample_id, sample.locality_id, sample.group]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (filters.bbox.enabled) {
      const trueInside = pointInBbox(sample.true_lon, sample.true_lat, filters.bbox);
      const predInside = pointInBbox(sample.pred_lon, sample.pred_lat, filters.bbox);
      if (filters.bbox.basis === "true" && !trueInside) return false;
      if (filters.bbox.basis === "predicted" && !predInside) return false;
      if (filters.bbox.basis === "either" && !trueInside && !predInside) return false;
    }
    return true;
  });
}

export function exportSamplesCsv(samples: SampleRecord[]) {
  const columns = [
    "sample_id",
    "age_bp",
    "true_lat",
    "true_lon",
    "pred_lat",
    "pred_lon",
    "error_km",
    "sigma_final",
    "alpha_precision",
    "group",
    "sequencing_type",
    "locality_id"
  ];
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return [columns.join(","), ...samples.map((s) => columns.map((c) => escape(s[c as keyof SampleRecord])).join(","))].join("\n");
}
