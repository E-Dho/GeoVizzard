import { useCallback } from "react";
import { Camera } from "lucide-react";
import { ControlPanel } from "./components/ControlPanel";
import { Legend } from "./components/Legend";
import { MapView } from "./components/MapView";
import { SampleInspector } from "./components/SampleInspector";
import { useAppState } from "./state/useAppState";

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
  const { setSelectedSampleId } = state;
  const selectSample = useCallback(
    (sample: { sample_id: string }) => setSelectedSampleId(sample.sample_id),
    [setSelectedSampleId]
  );
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
          samples={state.filteredSamples}
          selectedSample={state.selectedSample}
          layerSettings={state.deferredLayerSettings}
          viewState={state.viewState}
          setViewState={state.setViewState}
          onSelectSample={selectSample}
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
