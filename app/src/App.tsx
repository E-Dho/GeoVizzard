import { useCallback } from "react";
import { Camera } from "lucide-react";
import { ControlPanel } from "./components/ControlPanel";
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

  return (
    <main className="app">
      <ControlPanel {...state} />
      <div className="workspace">
        <MapView
          samples={state.filteredSamples}
          selectedSample={state.selectedSample}
          layerSettings={state.layerSettings}
          viewState={state.viewState}
          setViewState={state.setViewState}
          onSelectSample={selectSample}
        />
        <button className="png-button" onClick={exportMapPng} title="Export map PNG">
          <Camera size={16} />
          PNG
        </button>
      </div>
      <SampleInspector
        sample={state.selectedSample}
        selectedOnly={state.filters.selectedOnly}
        clearSelection={() => state.setSelectedSampleId(undefined)}
        setViewState={state.setViewState}
        setSelectedOnly={(enabled) =>
          state.setFilters((current) => ({ ...current, selectedOnly: enabled }))
        }
      />
    </main>
  );
}
