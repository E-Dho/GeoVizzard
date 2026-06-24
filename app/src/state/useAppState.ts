import { useCallback, useEffect, useMemo, useState } from "react";
import { applyFilters, defaultFilters, exportSamplesCsv, type Filters } from "../data/filters";
import {
  defaultSchemaMapping,
  type DatasetMetadata,
  type SampleRecord,
  type SchemaMapping,
  blankMetadata
} from "../data/schema";
import {
  applyTemporalAlpha,
  defaultTimeSettings,
  nearestAge,
  visibleWindow,
  type TimeSettings
} from "../data/time";
import {
  loadDatasetFromFile,
  loadDefaultDataset,
  type LoadedDataset
} from "../data/loadDataset";

export type ColorMode = "constant" | "error_km" | "alpha_precision" | "age_bp" | "group" | "sequencing_type";

export type LayerSettings = {
  trueLocations: boolean;
  predictedLocations: boolean;
  arrows: boolean;
  uncertainty: boolean;
  heatmap: boolean;
  selectedSample: boolean;
  neighbours: boolean;
  selectedDensityOnly: boolean;
  trueOpacity: number;
  predictedOpacity: number;
  arrowOpacity: number;
  uncertaintyOpacity: number;
  heatmapOpacity: number;
  arrowColorMode: ColorMode;
  pointColorMode: ColorMode;
  arrowWidthMode: "constant" | "error_km";
  maxArrows: number;
  uncertaintyMultiplier: 1 | 2 | 3;
  heatmapBandwidth: number;
  heatmapIntensity: number;
  heatmapThreshold: number;
  heatmapUseSigma: boolean;
  heatmapSource: "predicted" | "true" | "error_endpoints";
};

export type MapViewState = {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
};

export const defaultLayerSettings: LayerSettings = {
  trueLocations: true,
  predictedLocations: true,
  arrows: true,
  uncertainty: false,
  heatmap: true,
  selectedSample: true,
  neighbours: true,
  selectedDensityOnly: false,
  trueOpacity: 0.9,
  predictedOpacity: 0.9,
  arrowOpacity: 0.55,
  uncertaintyOpacity: 0.18,
  heatmapOpacity: 0.55,
  arrowColorMode: "error_km",
  pointColorMode: "group",
  arrowWidthMode: "constant",
  maxArrows: 5000,
  uncertaintyMultiplier: 1,
  heatmapBandwidth: 45,
  heatmapIntensity: 1.2,
  heatmapThreshold: 0.03,
  heatmapUseSigma: true,
  heatmapSource: "predicted"
};

export const defaultViewState: MapViewState = {
  longitude: 15,
  latitude: 50,
  zoom: 3.2,
  pitch: 0,
  bearing: 0
};

function downloadText(filename: string, text: string, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function useAppState() {
  const [samples, setSamples] = useState<SampleRecord[]>([]);
  const [metadata, setMetadata] = useState<DatasetMetadata>(blankMetadata);
  const [sourceName, setSourceName] = useState("No dataset loaded");
  const [schemaMapping, setSchemaMapping] = useState<SchemaMapping>(defaultSchemaMapping);
  const [schemaText, setSchemaText] = useState(JSON.stringify(defaultSchemaMapping, null, 2));
  const [timeSettings, setTimeSettings] = useState<TimeSettings>(defaultTimeSettings);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [layerSettings, setLayerSettings] = useState<LayerSettings>(defaultLayerSettings);
  const [viewState, setViewState] = useState<MapViewState>(defaultViewState);
  const [selectedSampleId, setSelectedSampleId] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const ingest = useCallback((dataset: LoadedDataset) => {
    setSamples(dataset.samples);
    setMetadata(dataset.metadata);
    setSourceName(dataset.sourceName);
    setSchemaMapping(dataset.schemaMapping);
    setSchemaText(JSON.stringify(dataset.schemaMapping, null, 2));
    setError(undefined);
    setTimeSettings((current) => ({
      ...current,
      centerAgeBp: nearestAge(current.centerAgeBp, dataset.metadata.availableAges),
      windowWidthYears: Math.min(
        Math.max(100, current.windowWidthYears),
        Math.max(100, dataset.metadata.ageExtent[1] - dataset.metadata.ageExtent[0])
      )
    }));
    setFilters((current) => ({
      ...current,
      groups: [],
      sequencingTypes: [],
      bbox: {
        ...current.bbox,
        minLon: Math.floor(dataset.metadata.coordinateExtent.minLon),
        maxLon: Math.ceil(dataset.metadata.coordinateExtent.maxLon),
        minLat: Math.floor(dataset.metadata.coordinateExtent.minLat),
        maxLat: Math.ceil(dataset.metadata.coordinateExtent.maxLat)
      }
    }));
  }, []);

  useEffect(() => {
    loadDefaultDataset(schemaMapping).then(ingest).catch((loadError: Error) => {
      setError(loadError.message);
    });
  }, []);

  const parseSchemaText = useCallback(() => {
    const parsed = JSON.parse(schemaText) as SchemaMapping;
    setSchemaMapping(parsed);
    return parsed;
  }, [schemaText]);

  const loadFile = useCallback(
    async (file: File) => {
      try {
        ingest(await loadDatasetFromFile(file, parseSchemaText()));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      }
    },
    [ingest, parseSchemaText]
  );

  const temporalSamples = useMemo(
    () => applyTemporalAlpha(samples, timeSettings, metadata.ageExtent),
    [samples, timeSettings, metadata.ageExtent]
  );

  const filteredSamples = useMemo(
    () => applyFilters(temporalSamples, filters, selectedSampleId),
    [temporalSamples, filters, selectedSampleId]
  );

  const primaryWindowCount = filteredSamples.filter((sample) => sample.inPrimaryWindow).length;
  const selectedSample = samples.find((sample) => sample.sample_id === selectedSampleId);
  const window = visibleWindow(timeSettings, metadata.ageExtent);

  const setCenterAge = useCallback(
    (age: number) => {
      const snapped = timeSettings.snapToAvailableDates
        ? nearestAge(age, metadata.availableAges)
        : age;
      setTimeSettings((current) => ({ ...current, centerAgeBp: snapped }));
    },
    [metadata.availableAges, timeSettings.snapToAvailableDates]
  );

  const setSchemaTextAndClearError = useCallback((next: string) => {
    setSchemaText(next);
    setError(undefined);
  }, []);

  const exportFilteredCsv = useCallback(() => {
    downloadText("geovizzard-filtered-samples.csv", exportSamplesCsv(filteredSamples), "text/csv");
  }, [filteredSamples]);

  const exportSettings = useCallback(() => {
    downloadText(
      "geovizzard-settings.json",
      JSON.stringify({ filters, timeSettings, layerSettings, viewState, schemaMapping }, null, 2),
      "application/json"
    );
  }, [filters, timeSettings, layerSettings, viewState, schemaMapping]);

  const loadSettings = useCallback(async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (parsed.filters) setFilters(parsed.filters);
    if (parsed.timeSettings) setTimeSettings(parsed.timeSettings);
    if (parsed.layerSettings) setLayerSettings(parsed.layerSettings);
    if (parsed.viewState) setViewState(parsed.viewState);
    if (parsed.schemaMapping) {
      setSchemaMapping(parsed.schemaMapping);
      setSchemaText(JSON.stringify(parsed.schemaMapping, null, 2));
    }
  }, []);

  return {
    samples,
    metadata,
    sourceName,
    schemaText,
    setSchemaText: setSchemaTextAndClearError,
    timeSettings,
    setTimeSettings,
    setCenterAge,
    filters,
    setFilters,
    layerSettings,
    setLayerSettings,
    viewState,
    setViewState,
    selectedSample,
    selectedSampleId,
    setSelectedSampleId,
    filteredSamples,
    primaryWindowCount,
    window,
    error,
    setError,
    loadFile,
    loadSettings,
    exportFilteredCsv,
    exportSettings
  };
}
