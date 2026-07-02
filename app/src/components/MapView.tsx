import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DeckGL from "@deck.gl/react";
import { COORDINATE_SYSTEM, OrthographicView } from "@deck.gl/core";
import Map from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import { projectSamplesToUtm, type UtmViewState } from "../data/utm";
import {
  loadNaturalEarthContext,
  projectNaturalEarthContextToUtm,
  type NaturalEarthContext
} from "../data/utmVectorContext";
import type { MapViewState } from "../state/useAppState";
import type { SampleRecord } from "../data/schema";
import type { LayerSettings } from "../state/useAppState";
import { trueLocationLayer } from "../layers/trueLocationLayer";
import { predictedLocationLayer } from "../layers/predictedLocationLayer";
import { arrowLayer } from "../layers/arrowLayer";
import { uncertaintyLayer } from "../layers/uncertaintyLayer";
import { heatmapLayer } from "../layers/heatmapLayer";
import { selectedSampleLayer } from "../layers/selectedSampleLayer";
import { outlierHighlightLayer } from "../layers/outlierHighlightLayer";
import { utmSelectedSampleLayer, utmUncertaintyLayer } from "../layers/utmMetricLayers";
import { utmContextLayers } from "../layers/utmContextLayer";

type BaseMap = "positron" | "topo" | "blank" | "utm";

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

const openTopoMap: StyleSpecification = {
  version: 8,
  sources: {
    opentopo: {
      type: "raster",
      tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution:
        "&copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)"
    }
  },
  layers: [
    {
      id: "opentopo",
      type: "raster",
      source: "opentopo",
      minzoom: 0,
      maxzoom: 17,
      paint: {
        "raster-opacity": 0.58,
        "raster-saturation": -0.45,
        "raster-brightness-min": 0.18
      }
    }
  ]
};

const blankMap: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#f8fafc" } }]
};

const baseMapStyles: Record<BaseMap, StyleSpecification> = {
  positron: positronNoLabels,
  topo: openTopoMap,
  blank: blankMap,
  utm: blankMap
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
  const [baseMap, setBaseMap] = useState<BaseMap>("positron");
  const [localViewState, setLocalViewState] = useState<MapViewState>(viewState);
  const [utmViewState, setUtmViewState] = useState<UtmViewState>({
    target: [0, 0, 0],
    zoom: 0
  });
  const [naturalEarthContext, setNaturalEarthContext] = useState<NaturalEarthContext>();
  const latestViewState = useRef<MapViewState>(viewState);
  const latestUtmViewState = useRef<UtmViewState>(utmViewState);
  const heatmapSamples =
    layerSettings.selectedDensityOnly && selectedSample ? [selectedSample] : samples;
  const displaySamples = layerSettings.selectedDensityOnly && selectedSample ? [selectedSample] : samples;
  const isUtmMode = baseMap === "utm";
  const utmData = useMemo(
    () => (isUtmMode ? projectSamplesToUtm(displaySamples, selectedSample) : undefined),
    [displaySamples, isUtmMode, selectedSample]
  );
  const utmViewKey = utmData
    ? `${utmData.info.epsg}:${utmData.samples.length}:${utmData.viewState.target.join(",")}:${utmData.viewState.zoom}`
    : "empty";

  useEffect(() => {
    latestViewState.current = viewState;
    setLocalViewState(viewState);
  }, [viewState]);

  useEffect(() => {
    if (!utmData) return;
    latestUtmViewState.current = utmData.viewState;
    setUtmViewState(utmData.viewState);
  }, [utmData, utmViewKey]);

  useEffect(() => {
    if (!isUtmMode || naturalEarthContext) return undefined;
    const controller = new AbortController();
    loadNaturalEarthContext(controller.signal)
      .then(setNaturalEarthContext)
      .catch(() => {
        if (!controller.signal.aborted) {
          setNaturalEarthContext(undefined);
        }
      });
    return () => controller.abort();
  }, [isUtmMode, naturalEarthContext]);

  const handleViewStateChange = useCallback(({ viewState: next }: { viewState: unknown }) => {
    const nextViewState = next as MapViewState;
    latestViewState.current = nextViewState;
    setLocalViewState(nextViewState);
  }, []);

  const handleUtmViewStateChange = useCallback(({ viewState: next }: { viewState: unknown }) => {
    const nextViewState = next as UtmViewState;
    latestUtmViewState.current = nextViewState;
    setUtmViewState(nextViewState);
  }, []);

  const handleBaseMapChange = useCallback((nextBaseMap: BaseMap) => {
    if (nextBaseMap !== "utm") {
      setLocalViewState(latestViewState.current);
    }
    setBaseMap(nextBaseMap);
  }, []);

  const handleInteractionStateChange = useCallback(
    (interactionState: {
      isDragging?: boolean;
      isPanning?: boolean;
      isRotating?: boolean;
      isZooming?: boolean;
    }) => {
      const moving =
        interactionState.isDragging ||
        interactionState.isPanning ||
        interactionState.isRotating ||
        interactionState.isZooming;
      if (!moving) {
        setViewState(latestViewState.current);
      }
    },
    [setViewState]
  );

  const layers = useMemo(
    () => [
      heatmapLayer(heatmapSamples, layerSettings),
      uncertaintyLayer(displaySamples, layerSettings, onSelectSample),
      arrowLayer(displaySamples, layerSettings, onSelectSample),
      trueLocationLayer(displaySamples, layerSettings, onSelectSample),
      predictedLocationLayer(displaySamples, layerSettings, onSelectSample),
      outlierHighlightLayer(displaySamples, layerSettings, onSelectSample),
      ...selectedSampleLayer(selectedSample, layerSettings)
    ],
    [baseMap, displaySamples, heatmapSamples, layerSettings, onSelectSample, selectedSample]
  );
  const utmNaturalEarthLines = useMemo(
    () =>
      isUtmMode && utmData && naturalEarthContext
        ? projectNaturalEarthContextToUtm(naturalEarthContext, utmData.info, utmData.context.bounds)
        : [],
    [isUtmMode, naturalEarthContext, utmData]
  );
  const utmLayers = useMemo(
    () =>
      utmData
        ? [
            ...utmContextLayers(utmData.context, utmNaturalEarthLines),
            utmUncertaintyLayer(utmData.samples, layerSettings, onSelectSample),
            arrowLayer(utmData.samples, layerSettings, onSelectSample, {
              coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
              id: "utm-prediction-arrows"
            }),
            trueLocationLayer(utmData.samples, layerSettings, onSelectSample, {
              coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
              id: "utm-true-locations"
            }),
            predictedLocationLayer(utmData.samples, layerSettings, onSelectSample, {
              coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
              id: "utm-predicted-locations"
            }),
            outlierHighlightLayer(utmData.samples, layerSettings, onSelectSample, {
              coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
              id: "utm-potential-outlier-highlight"
            }),
            ...utmSelectedSampleLayer(utmData.selectedSample, layerSettings)
          ]
        : [],
    [baseMap, layerSettings, onSelectSample, utmData, utmNaturalEarthLines]
  );

  return (
    <section className={baseMap === "utm" ? "map-shell utm-shell" : "map-shell"}>
      <div className="map-toolbar">
        <button className={baseMap === "positron" ? "active" : ""} onClick={() => handleBaseMapChange("positron")}>
          Positron
        </button>
        <button className={baseMap === "topo" ? "active" : ""} onClick={() => handleBaseMapChange("topo")}>
          Topo
        </button>
        <button className={baseMap === "utm" ? "active" : ""} onClick={() => handleBaseMapChange("utm")}>
          UTM
        </button>
        <button className={baseMap === "blank" ? "active" : ""} onClick={() => handleBaseMapChange("blank")}>
          Blank
        </button>
      </div>
      {baseMap === "utm" ? (
        <>
          <DeckGL
            key="utm-deck"
            layers={utmLayers}
            controller
            views={new OrthographicView({ id: "utm" })}
            viewState={utmViewState}
            onViewStateChange={handleUtmViewStateChange}
            getTooltip={({ object }) =>
              object?.sample_id ? `${object.sample_id}\nAge: ${object.age_bp} BP` : null
            }
          />
          <div className="projection-badge">
            {utmData ? utmData.info.label : "UTM unavailable: no visible samples"}
          </div>
        </>
      ) : (
        <DeckGL
          key="geographic-deck"
          layers={layers}
          controller
          viewState={localViewState}
          onViewStateChange={handleViewStateChange}
          onInteractionStateChange={handleInteractionStateChange}
          getTooltip={({ object }) =>
            object?.sample_id ? `${object.sample_id}\nAge: ${object.age_bp} BP` : null
          }
        >
          <Map mapLib={maplibregl} mapStyle={baseMapStyles[baseMap]} />
        </DeckGL>
      )}
    </section>
  );
}
