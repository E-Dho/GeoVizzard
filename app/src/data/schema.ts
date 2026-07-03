export type ColumnKey =
  | "sample_id"
  | "true_lat"
  | "true_lon"
  | "pred_lat"
  | "pred_lon"
  | "age_bp"
  | "error_km"
  | "sigma_final"
  | "alpha_precision"
  | "group"
  | "original_group"
  | "sequencing_type"
  | "locality_id"
  | "mu_knn_lat"
  | "mu_knn_lon"
  | "sigma_knn_corrected"
  | "mu_mlp_lat"
  | "mu_mlp_lon"
  | "sigma_mlp"
  | "neighbor_ids"
  | "neighbor_lats"
  | "neighbor_lons"
  | "neighbor_distances"
  | "potential_outlier";

export type SchemaMapping = Partial<Record<ColumnKey, string>>;

export type NeighborInfo = {
  id: string;
  lat?: number;
  lon?: number;
  distance?: number;
};

export type SampleRecord = {
  sample_id: string;
  true_lat: number;
  true_lon: number;
  pred_lat: number;
  pred_lon: number;
  age_bp: number;
  error_km?: number;
  sigma_final?: number;
  alpha_precision?: number;
  group?: string;
  original_group?: string;
  sequencing_type?: string;
  locality_id?: string;
  mu_knn_lat?: number;
  mu_knn_lon?: number;
  sigma_knn_corrected?: number;
  mu_mlp_lat?: number;
  mu_mlp_lon?: number;
  sigma_mlp?: number;
  potential_outlier?: boolean;
  neighbors?: NeighborInfo[];
  temporalAlpha: number;
  inPrimaryWindow: boolean;
  inComparisonWindow: boolean;
};

export type DatasetMetadata = {
  rowCount: number;
  ageExtent: [number, number];
  availableAges: number[];
  groups: string[];
  sequencingTypes: string[];
  coordinateExtent: {
    minLon: number;
    maxLon: number;
    minLat: number;
    maxLat: number;
  };
  optionalFields: Set<ColumnKey>;
};

export const requiredColumns: ColumnKey[] = [
  "sample_id",
  "true_lat",
  "true_lon",
  "pred_lat",
  "pred_lon",
  "age_bp"
];

export const defaultSchemaMapping: SchemaMapping = {
  sample_id: "sample_id",
  true_lat: "true_lat",
  true_lon: "true_lon",
  pred_lat: "pred_lat",
  pred_lon: "pred_lon",
  age_bp: "age_bp",
  error_km: "error_km",
  sigma_final: "sigma_final",
  alpha_precision: "alpha_precision",
  group: "group",
  original_group: "original_group",
  sequencing_type: "sequencing_type",
  locality_id: "locality_id",
  mu_knn_lat: "mu_knn_lat",
  mu_knn_lon: "mu_knn_lon",
  sigma_knn_corrected: "sigma_knn_corrected",
  mu_mlp_lat: "mu_mlp_lat",
  mu_mlp_lon: "mu_mlp_lon",
  sigma_mlp: "sigma_mlp",
  neighbor_ids: "neighbor_ids",
  neighbor_lats: "neighbor_lats",
  neighbor_lons: "neighbor_lons",
  neighbor_distances: "neighbor_distances",
  potential_outlier: "potential_outlier"
};

export const blankMetadata: DatasetMetadata = {
  rowCount: 0,
  ageExtent: [0, 0],
  availableAges: [],
  groups: [],
  sequencingTypes: [],
  coordinateExtent: { minLon: -12, maxLon: 38, minLat: 34, maxLat: 72 },
  optionalFields: new Set()
};
