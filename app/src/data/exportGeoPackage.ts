import {
  BoundingBox,
  GeoPackageAPI,
  setSqljsWasmLocateFile
} from "@ngageoint/geopackage";
import sqlWasmUrl from "@ngageoint/geopackage/dist/sql-wasm.wasm?url";
import type { Feature, Point } from "geojson";
import type { SampleRecord } from "./schema";

setSqljsWasmLocateFile(() => sqlWasmUrl);

type GpkgProperty = string | number | boolean | null;

const featureProperties = [
  { name: "sample_id", dataType: "TEXT" },
  { name: "location_kind", dataType: "TEXT" },
  { name: "age_bp", dataType: "DOUBLE" },
  { name: "true_lat", dataType: "DOUBLE" },
  { name: "true_lon", dataType: "DOUBLE" },
  { name: "pred_lat", dataType: "DOUBLE" },
  { name: "pred_lon", dataType: "DOUBLE" },
  { name: "error_km", dataType: "DOUBLE" },
  { name: "sigma_final", dataType: "DOUBLE" },
  { name: "alpha_precision", dataType: "DOUBLE" },
  { name: "potential_outlier", dataType: "BOOLEAN" },
  { name: "group_name", dataType: "TEXT" },
  { name: "sequencing_type", dataType: "TEXT" },
  { name: "locality_id", dataType: "TEXT" },
  { name: "mu_knn_lat", dataType: "DOUBLE" },
  { name: "mu_knn_lon", dataType: "DOUBLE" },
  { name: "sigma_knn_corrected", dataType: "DOUBLE" },
  { name: "mu_mlp_lat", dataType: "DOUBLE" },
  { name: "mu_mlp_lon", dataType: "DOUBLE" },
  { name: "sigma_mlp", dataType: "DOUBLE" },
  { name: "temporal_alpha", dataType: "DOUBLE" },
  { name: "in_primary_window", dataType: "BOOLEAN" },
  { name: "in_comparison_window", dataType: "BOOLEAN" }
];

function value(value: string | number | boolean | undefined): GpkgProperty {
  return value ?? null;
}

function baseProperties(sample: SampleRecord, locationKind: "predicted" | "true") {
  return {
    sample_id: sample.sample_id,
    location_kind: locationKind,
    age_bp: sample.age_bp,
    true_lat: sample.true_lat,
    true_lon: sample.true_lon,
    pred_lat: sample.pred_lat,
    pred_lon: sample.pred_lon,
    error_km: value(sample.error_km),
    sigma_final: value(sample.sigma_final),
    alpha_precision: value(sample.alpha_precision),
    potential_outlier: value(sample.potential_outlier),
    group_name: value(sample.group),
    sequencing_type: value(sample.sequencing_type),
    locality_id: value(sample.locality_id),
    mu_knn_lat: value(sample.mu_knn_lat),
    mu_knn_lon: value(sample.mu_knn_lon),
    sigma_knn_corrected: value(sample.sigma_knn_corrected),
    mu_mlp_lat: value(sample.mu_mlp_lat),
    mu_mlp_lon: value(sample.mu_mlp_lon),
    sigma_mlp: value(sample.sigma_mlp),
    temporal_alpha: sample.temporalAlpha,
    in_primary_window: sample.inPrimaryWindow,
    in_comparison_window: sample.inComparisonWindow
  };
}

function pointFeature(
  sample: SampleRecord,
  locationKind: "predicted" | "true"
): Feature<Point> {
  const coordinates =
    locationKind === "predicted"
      ? [sample.pred_lon, sample.pred_lat]
      : [sample.true_lon, sample.true_lat];
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates
    },
    properties: baseProperties(sample, locationKind)
  };
}

function tableBoundingBox(samples: SampleRecord[], locationKind: "predicted" | "true") {
  const lons = samples.map((sample) =>
    locationKind === "predicted" ? sample.pred_lon : sample.true_lon
  );
  const lats = samples.map((sample) =>
    locationKind === "predicted" ? sample.pred_lat : sample.true_lat
  );
  return new BoundingBox(
    Math.min(...lons),
    Math.max(...lons),
    Math.min(...lats),
    Math.max(...lats)
  );
}

export async function exportSamplesGeoPackage(samples: SampleRecord[]) {
  if (!samples.length) {
    throw new Error("No filtered samples are available to export.");
  }

  const geoPackage = await GeoPackageAPI.create("geovizzard-filtered-samples.gpkg");
  try {
    const tables: Array<{ name: string; kind: "predicted" | "true" }> = [
      { name: "predicted_locations", kind: "predicted" },
      { name: "true_locations", kind: "true" }
    ];

    for (const table of tables) {
      geoPackage.createFeatureTable(
        table.name,
        undefined,
        featureProperties,
        tableBoundingBox(samples, table.kind)
      );
      await geoPackage.addGeoJSONFeaturesToGeoPackage(
        samples.map((sample) => pointFeature(sample, table.kind)),
        table.name,
        false
      );
    }

    return await geoPackage.export();
  } finally {
    geoPackage.close();
  }
}
