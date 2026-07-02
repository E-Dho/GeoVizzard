import {
  blankMetadata,
  defaultSchemaMapping,
  requiredColumns,
  type ColumnKey,
  type DatasetMetadata,
  type NeighborInfo,
  type SampleRecord,
  type SchemaMapping
} from "./schema";

export type LoadedDataset = {
  samples: SampleRecord[];
  metadata: DatasetMetadata;
  sourceName: string;
  schemaMapping: SchemaMapping;
};

type RawRow = Record<string, string>;

function parseDelimited(text: string, delimiter?: string): RawRow[] {
  const rows: string[][] = [];
  const sep = delimiter ?? (text.slice(0, 1000).includes("\t") ? "\t" : ",");
  let cell = "";
  let row: string[] = [];
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === sep && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);

  const headers = rows.shift()?.map((header) => header.trim()) ?? [];
  return rows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""]))
  );
}

function numberValue(row: RawRow, column?: string) {
  if (!column) return undefined;
  const raw = row[column];
  if (raw === undefined || raw === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function stringValue(row: RawRow, column?: string) {
  if (!column) return undefined;
  const value = row[column]?.trim();
  return value ? value : undefined;
}

function booleanValue(row: RawRow, column?: string) {
  const raw = stringValue(row, column)?.toLowerCase();
  if (!raw) return undefined;
  if (["1", "true", "yes", "y", "outlier", "potential outlier"].includes(raw)) return true;
  if (["0", "false", "no", "n"].includes(raw)) return false;
  return undefined;
}

function parseArray(raw?: string) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Fall through to delimiter parsing.
  }
  return raw
    .split(/[|;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNeighbors(row: RawRow, mapping: SchemaMapping): NeighborInfo[] | undefined {
  const ids = parseArray(stringValue(row, mapping.neighbor_ids));
  if (!ids.length) return undefined;
  const lats = parseArray(stringValue(row, mapping.neighbor_lats)).map(Number);
  const lons = parseArray(stringValue(row, mapping.neighbor_lons)).map(Number);
  const distances = parseArray(stringValue(row, mapping.neighbor_distances)).map(Number);
  return ids.map((id, index) => ({
    id: String(id),
    lat: Number.isFinite(lats[index]) ? lats[index] : undefined,
    lon: Number.isFinite(lons[index]) ? lons[index] : undefined,
    distance: Number.isFinite(distances[index]) ? distances[index] : undefined
  }));
}

export function validateColumns(headers: string[], mapping: SchemaMapping) {
  const missing = requiredColumns.filter((key) => {
    const mapped = mapping[key];
    return !mapped || !headers.includes(mapped);
  });
  if (missing.length) {
    throw new Error(
      `Missing required column mapping(s): ${missing
        .map((key) => `${key} -> ${mapping[key] ?? "(not mapped)"}`)
        .join(", ")}. Update the schema mapping or load a compatible dataset.`
    );
  }
}

function normalizeRows(rows: RawRow[], mapping: SchemaMapping): SampleRecord[] {
  return rows
    .map((row) => {
      const sampleId = stringValue(row, mapping.sample_id);
      const trueLat = numberValue(row, mapping.true_lat);
      const trueLon = numberValue(row, mapping.true_lon);
      const predLat = numberValue(row, mapping.pred_lat);
      const predLon = numberValue(row, mapping.pred_lon);
      const ageBp = numberValue(row, mapping.age_bp);
      if (
        !sampleId ||
        trueLat === undefined ||
        trueLon === undefined ||
        predLat === undefined ||
        predLon === undefined ||
        ageBp === undefined
      ) {
        return undefined;
      }
      const sample: SampleRecord = {
        sample_id: sampleId,
        true_lat: trueLat,
        true_lon: trueLon,
        pred_lat: predLat,
        pred_lon: predLon,
        age_bp: ageBp,
        temporalAlpha: 1,
        inPrimaryWindow: true,
        inComparisonWindow: false
      };
      const optionalValues: Partial<SampleRecord> = {
        error_km: numberValue(row, mapping.error_km),
        sigma_final: numberValue(row, mapping.sigma_final),
        alpha_precision: numberValue(row, mapping.alpha_precision),
        group: stringValue(row, mapping.group),
        sequencing_type: stringValue(row, mapping.sequencing_type),
        locality_id: stringValue(row, mapping.locality_id),
        mu_knn_lat: numberValue(row, mapping.mu_knn_lat),
        mu_knn_lon: numberValue(row, mapping.mu_knn_lon),
        sigma_knn_corrected: numberValue(row, mapping.sigma_knn_corrected),
        mu_mlp_lat: numberValue(row, mapping.mu_mlp_lat),
        mu_mlp_lon: numberValue(row, mapping.mu_mlp_lon),
        sigma_mlp: numberValue(row, mapping.sigma_mlp),
        potential_outlier: booleanValue(row, mapping.potential_outlier),
        neighbors: parseNeighbors(row, mapping)
      };
      Object.entries(optionalValues).forEach(([key, value]) => {
        if (value !== undefined) {
          (sample as Record<string, unknown>)[key] = value;
        }
      });
      return sample;
    })
    .filter((sample): sample is SampleRecord => Boolean(sample));
}

export function inferMetadata(samples: SampleRecord[], mapping: SchemaMapping): DatasetMetadata {
  if (!samples.length) return blankMetadata;
  const ages = samples.map((sample) => sample.age_bp).sort((a, b) => a - b);
  const groups = new Set(samples.map((sample) => sample.group).filter(Boolean) as string[]);
  const sequencingTypes = new Set(
    samples.map((sample) => sample.sequencing_type).filter(Boolean) as string[]
  );
  const lons = samples.flatMap((sample) => [sample.true_lon, sample.pred_lon]);
  const lats = samples.flatMap((sample) => [sample.true_lat, sample.pred_lat]);
  const optionalFields = new Set<ColumnKey>();
  Object.keys(mapping).forEach((key) => {
    if (!requiredColumns.includes(key as ColumnKey)) optionalFields.add(key as ColumnKey);
  });

  return {
    rowCount: samples.length,
    ageExtent: [ages[0], ages[ages.length - 1]],
    availableAges: Array.from(new Set(ages)),
    groups: Array.from(groups).sort(),
    sequencingTypes: Array.from(sequencingTypes).sort(),
    coordinateExtent: {
      minLon: Math.min(...lons),
      maxLon: Math.max(...lons),
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats)
    },
    optionalFields
  };
}

export async function loadDatasetFromText(
  text: string,
  sourceName: string,
  schemaMapping: SchemaMapping = defaultSchemaMapping
): Promise<LoadedDataset> {
  const mapping = { ...defaultSchemaMapping, ...schemaMapping };
  const rows = parseDelimited(text);
  const headers = Object.keys(rows[0] ?? {});
  validateColumns(headers, mapping);
  const samples = normalizeRows(rows, mapping);
  if (!samples.length) throw new Error("No valid sample rows were found after schema normalization.");
  return {
    samples,
    metadata: inferMetadata(samples, mapping),
    sourceName,
    schemaMapping: mapping
  };
}

export async function loadDatasetFromFile(file: File, schemaMapping: SchemaMapping) {
  if (file.name.toLowerCase().endsWith(".parquet")) {
    throw new Error(
      "Parquet files are recognized, but this static build currently enables CSV/TSV loading. The loader is isolated in src/data/loadDataset.ts so a browser Parquet reader can be added without touching the app state or layer code."
    );
  }
  return loadDatasetFromText(await file.text(), file.name, schemaMapping);
}

export async function loadDefaultDataset(schemaMapping: SchemaMapping) {
  const response = await fetch("/data/default.csv");
  if (!response.ok) throw new Error("No default dataset found at public/data/default.csv.");
  return loadDatasetFromText(await response.text(), "public/data/default.csv", schemaMapping);
}
