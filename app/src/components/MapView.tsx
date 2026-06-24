import { useMemo, useState } from "react";
import DeckGL from "@deck.gl/react";
import Map from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import type { MapViewState } from "../state/useAppState";
import type { SampleRecord } from "../data/schema";
import type { LayerSettings } from "../state/useAppState";
import { trueLocationLayer } from "../layers/trueLocationLayer";
import { predictedLocationLayer } from "../layers/predictedLocationLayer";
import { arrowLayer } from "../layers/arrowLayer";
import { uncertaintyLayer } from "../layers/uncertaintyLayer";
import { heatmapLayer } from "../layers/heatmapLayer";
import { selectedSampleLayer } from "../layers/selectedSampleLayer";

const positronNoLabels: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png"
      ],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO"
    }
  },
  layers: [{ id: "carto", type: "raster", source: "carto", minzoom: 0, maxzoom: 19 }]
};

const blankMap: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#f8fafc" } }]
};

type Props = {
  samples: SampleRecord[];
  selectedSample?: SampleRecord;
  layerSettings: LayerSettings;
  viewState: MapViewState;
  setViewState: (viewState: MapViewState) => void;
  onSelectSample: (sample: SampleRecord) => void;
};

export function MapView({
  samples,
  selectedSample,
  layerSettings,
  viewState,
  setViewState,
  onSelectSample
}: Props) {
  const [blank, setBlank] = useState(false);
  const heatmapSamples =
    layerSettings.selectedDensityOnly && selectedSample ? [selectedSample] : samples;
  const displaySamples = layerSettings.selectedDensityOnly && selectedSample ? [selectedSample] : samples;

  const layers = useMemo(
    () => [
      heatmapLayer(heatmapSamples, layerSettings),
      uncertaintyLayer(displaySamples, layerSettings, onSelectSample),
      arrowLayer(displaySamples, layerSettings, onSelectSample),
      trueLocationLayer(displaySamples, layerSettings, onSelectSample),
      predictedLocationLayer(displaySamples, layerSettings, onSelectSample),
      ...selectedSampleLayer(selectedSample, layerSettings)
    ],
    [displaySamples, heatmapSamples, layerSettings, onSelectSample, selectedSample]
  );

  return (
    <section className="map-shell">
      <div className="map-toolbar">
        <button className={blank ? "" : "active"} onClick={() => setBlank(false)}>
          Positron
        </button>
        <button className={blank ? "active" : ""} onClick={() => setBlank(true)}>
          Blank
        </button>
      </div>
      <DeckGL
        layers={layers}
        controller
        viewState={viewState}
        onViewStateChange={({ viewState: next }) => setViewState(next as MapViewState)}
        getTooltip={({ object }) =>
          object?.sample_id ? `${object.sample_id}\nAge: ${object.age_bp} BP` : null
        }
      >
        <Map mapLib={maplibregl} mapStyle={blank ? blankMap : positronNoLabels} />
      </DeckGL>
    </section>
  );
}
