import { useCallback, useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { ControlPanel } from "./components/ControlPanel";
import { Legend } from "./components/Legend";
import { MapView } from "./components/MapView";
import { SampleInspector } from "./components/SampleInspector";
import { useAppState } from "./state/useAppState";
import type { SampleRecord } from "./data/schema";

const MAP_RENDER_THROTTLE_MS = 350;
const EMPTY_SAMPLE_LIST: SampleRecord[] = [];
const EMPTY_ID_LIST: string[] = [];

function useThrottledMapValue<T>(value: T, delayMs: number) {
  const [throttledValue, setThrottledValue] = useState(value);
  const latestValue = useRef(value);
  const lastCommitAt = useRef(0);
  const timeoutId = useRef<ReturnType<typeof globalThis.setTimeout>>();

  useEffect(() => {
    latestValue.current = value;
    const now = globalThis.performance.now();
    const remaining = delayMs - (now - lastCommitAt.current);

    const commit = () => {
      lastCommitAt.current = globalThis.performance.now();
      timeoutId.current = undefined;
      setThrottledValue(latestValue.current);
    };

    if (remaining <= 0) {
      if (timeoutId.current !== undefined) {
        globalThis.clearTimeout(timeoutId.current);
        timeoutId.current = undefined;
      }
      commit();
    } else if (timeoutId.current === undefined) {
      timeoutId.current = globalThis.setTimeout(commit, remaining);
    }
  }, [delayMs, value]);

  useEffect(
    () => () => {
      if (timeoutId.current !== undefined) {
        globalThis.clearTimeout(timeoutId.current);
      }
    },
    []
  );

  return throttledValue;
}

function exportMapPng() {
  const canvas = document.querySelector("canvas");
  if (!canvas) return;
  try {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "geovizzard-map.png";
      link.click();
      URL.revokeObjectURL(url);
    });
  } catch {
    window.alert("PNG export is not available for this map view, likely because a tile source tainted the canvas.");
  }
}

export default function App() {
  const state = useAppState();
  const mapSamples = useThrottledMapValue(state.filteredSamples, MAP_RENDER_THROTTLE_MS);
  const mapLayerSettings = useThrottledMapValue(state.deferredLayerSettings, MAP_RENDER_THROTTLE_MS);
  const { setSelectedSampleId } = state;
  const selectSample = useCallback(
    (sample: { sample_id: string }) => setSelectedSampleId(sample.sample_id),
    [setSelectedSampleId]
  );
  const selectMaterializedSample = useCallback(
    (sample: { sample_id: string }) =>
      state.setExplorationSettings((current) => ({
        ...current,
        selectedMaterializedSampleId: sample.sample_id
      })),
    [state.setExplorationSettings]
  );
  const explorationActive = Boolean(state.filters.selectedOnly && state.selectedSample);
  const materializedSamples = explorationActive
    ? state.materializedNeighborSamples
    : EMPTY_SAMPLE_LIST;
  const sameGroupMaterializedSamples = explorationActive
    ? state.sameGroupMaterializedSamples
    : EMPTY_SAMPLE_LIST;
  const materializedPredictedIds = explorationActive
    ? state.explorationSettings.predictedNeighborIds
    : EMPTY_ID_LIST;
  const legend = (
    <Legend
      samples={state.filteredSamples}
      allSamples={state.samples}
      metadata={state.metadata}
      settings={state.deferredLayerSettings}
    />
  );
  const legendPlacement = state.uiSettings.legendPlacement;

  return (
    <main className="app">
      <ControlPanel {...state} />
      <div className="workspace">
        <MapView
          samples={mapSamples}
          selectedSample={state.selectedSample}
          materializedSamples={materializedSamples}
          sameGroupMaterializedSamples={sameGroupMaterializedSamples}
          materializedPredictedIds={materializedPredictedIds}
          sameGroupPredicted={
            explorationActive && state.explorationSettings.sameGroupPredicted
          }
          sameGroupNeighbors={
            explorationActive && state.explorationSettings.sameGroupNeighbors
          }
          selectedMaterializedSample={
            explorationActive ? state.selectedMaterializedSample : undefined
          }
          layerSettings={mapLayerSettings}
          viewState={state.viewState}
          setViewState={state.setViewState}
          onSelectSample={selectSample}
          onSelectMaterializedSample={selectMaterializedSample}
        />
        <button className="png-button" onClick={exportMapPng} title="Export map PNG">
          <Camera size={16} />
          PNG
        </button>
        {legendPlacement === "map" && (
          <div className={`map-legend map-legend-${state.uiSettings.legendMapCorner}`}>
            {legend}
          </div>
        )}
      </div>
      <aside
        className={`right-panel ${
          legendPlacement === "right-top"
            ? "legend-top"
            : legendPlacement === "right-bottom"
              ? "legend-bottom"
              : ""
        }`}
      >
        {legendPlacement === "right-top" && legend}
        <SampleInspector
          sample={state.selectedSample}
          allSamples={state.samples}
          selectedOnly={state.filters.selectedOnly}
          clearSelection={() => state.setSelectedSampleId(undefined)}
          setViewState={state.setViewState}
          setSelectedOnly={(enabled) =>
            state.setFilters((current) => ({ ...current, selectedOnly: enabled }))
          }
        />
        {legendPlacement === "right-bottom" && legend}
      </aside>
    </main>
  );
}
