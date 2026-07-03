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
import { materializedNeighborLayers } from "../layers/materializedNeighborLayer";
import { sameGroupNeighborContextLayers } from "../layers/sameGroupNeighborContextLayer";

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
  materializedSamples: SampleRecord[];
  sameGroupMaterializedSamples: SampleRecord[];
  materializedPredictedIds: string[];
  sameGroupPredicted: boolean;
  sameGroupNeighbors: boolean;
  selectedMaterializedSample?: SampleRecord;
  layerSettings: LayerSettings;
  viewState: MapViewState;
  setViewState: (viewState: MapViewState) => void;
  onSelectSample: (sample: SampleRecord) => void;
  onSelectMaterializedSample: (sample: SampleRecord) => void;
};

function uniqueSamples(samples: SampleRecord[]) {
  const seen = new Set<string>();
  return samples.filter((sample) => {
    if (seen.has(sample.sample_id)) return false;
    seen.add(sample.sample_id);
    return true;
  });
}

const EMPTY_SAMPLE_LIST: SampleRecord[] = [];

export function MapView({
  samples,
  selectedSample,
  materializedSamples,
  sameGroupMaterializedSamples,
  materializedPredictedIds,
  sameGroupPredicted,
  sameGroupNeighbors,
  selectedMaterializedSample,
  layerSettings,
  viewState,
  setViewState,
  onSelectSample,
  onSelectMaterializedSample
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
  const hasMaterializedSamples = materializedSamples.length > 0;
  const hasSameGroupMaterializedSamples = sameGroupMaterializedSamples.length > 0;
  const hasExplorationOverlaySamples = hasMaterializedSamples || hasSameGroupMaterializedSamples;
  const materializedPredictedIdSet = useMemo(
    () => (hasMaterializedSamples ? new Set(materializedPredictedIds) : new Set<string>()),
    [hasMaterializedSamples, materializedPredictedIds]
  );
  const sameGroupPredictedIdSet = useMemo(
    () =>
      hasSameGroupMaterializedSamples && sameGroupPredicted
        ? new Set(sameGroupMaterializedSamples.map((sample) => sample.sample_id))
        : new Set<string>(),
    [hasSameGroupMaterializedSamples, sameGroupMaterializedSamples, sameGroupPredicted]
  );
  const selectedMaterializedSampleId = selectedMaterializedSample?.sample_id;
  const utmSourceSamples = useMemo(
    () =>
      isUtmMode && hasExplorationOverlaySamples
        ? uniqueSamples([...displaySamples, ...materializedSamples, ...sameGroupMaterializedSamples])
        : displaySamples,
    [
      displaySamples,
      hasExplorationOverlaySamples,
      hasMaterializedSamples,
      isUtmMode,
      materializedSamples,
      sameGroupMaterializedSamples
    ]
  );
  const utmData = useMemo(
    () => (isUtmMode ? projectSamplesToUtm(utmSourceSamples, selectedSample) : undefined),
    [isUtmMode, selectedSample, utmSourceSamples]
  );
  const utmDisplaySamples = useMemo(() => {
    if (!utmData) return EMPTY_SAMPLE_LIST;
    if (!hasExplorationOverlaySamples) return utmData.samples;
    const displaySampleIds = new Set(displaySamples.map((sample) => sample.sample_id));
    return utmData.samples.filter((sample) => displaySampleIds.has(sample.sample_id));
  }, [displaySamples, hasExplorationOverlaySamples, utmData]);
  const utmMaterializedSamples = useMemo(() => {
    if (!utmData || !hasMaterializedSamples) return EMPTY_SAMPLE_LIST;
    const materializedSampleIds = new Set(materializedSamples.map((sample) => sample.sample_id));
    return utmData.samples.filter((sample) => materializedSampleIds.has(sample.sample_id));
  }, [hasMaterializedSamples, materializedSamples, utmData]);
  const utmSameGroupMaterializedSamples = useMemo(() => {
    if (!utmData || !hasSameGroupMaterializedSamples) return EMPTY_SAMPLE_LIST;
    const sameGroupSampleIds = new Set(sameGroupMaterializedSamples.map((sample) => sample.sample_id));
    return utmData.samples.filter((sample) => sameGroupSampleIds.has(sample.sample_id));
  }, [hasSameGroupMaterializedSamples, sameGroupMaterializedSamples, utmData]);
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
      ...selectedSampleLayer(selectedSample, layerSettings),
      ...(hasMaterializedSamples
        ? materializedNeighborLayers(
            materializedSamples,
            materializedPredictedIdSet,
            selectedMaterializedSampleId,
            onSelectMaterializedSample
          )
        : []),
      ...(hasSameGroupMaterializedSamples
        ? materializedNeighborLayers(
            sameGroupMaterializedSamples,
            sameGroupPredictedIdSet,
            selectedMaterializedSampleId,
            onSelectMaterializedSample,
            {
              idPrefix: "same-group-materialized",
              trueColor: [99, 102, 241, 235],
              predictedColor: [129, 140, 248, 235],
              lineColor: [99, 102, 241, 115]
            }
          )
        : []),
      ...(hasSameGroupMaterializedSamples && sameGroupNeighbors
        ? sameGroupNeighborContextLayers(sameGroupMaterializedSamples)
        : [])
    ],
    [
      baseMap,
      displaySamples,
      heatmapSamples,
      layerSettings,
      materializedPredictedIdSet,
      materializedSamples,
      hasMaterializedSamples,
      hasSameGroupMaterializedSamples,
      onSelectMaterializedSample,
      onSelectSample,
      sameGroupMaterializedSamples,
      sameGroupNeighbors,
      sameGroupPredictedIdSet,
      selectedMaterializedSampleId,
      selectedSample
    ]
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
            utmUncertaintyLayer(utmDisplaySamples, layerSettings, onSelectSample),
            arrowLayer(utmDisplaySamples, layerSettings, onSelectSample, {
              coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
              id: "utm-prediction-arrows"
            }),
            trueLocationLayer(utmDisplaySamples, layerSettings, onSelectSample, {
              coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
              id: "utm-true-locations"
            }),
            predictedLocationLayer(utmDisplaySamples, layerSettings, onSelectSample, {
              coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
              id: "utm-predicted-locations"
            }),
            outlierHighlightLayer(utmDisplaySamples, layerSettings, onSelectSample, {
              coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
              id: "utm-potential-outlier-highlight"
            }),
            ...utmSelectedSampleLayer(utmData.selectedSample, layerSettings),
            ...(hasMaterializedSamples
              ? materializedNeighborLayers(
                  utmMaterializedSamples,
                  materializedPredictedIdSet,
                  selectedMaterializedSampleId,
                  onSelectMaterializedSample,
                  {
                    coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
                    idPrefix: "utm-materialized-neighbor"
                  }
                )
              : []),
            ...(hasSameGroupMaterializedSamples
              ? materializedNeighborLayers(
                  utmSameGroupMaterializedSamples,
                  sameGroupPredictedIdSet,
                  selectedMaterializedSampleId,
                  onSelectMaterializedSample,
                  {
                    coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
                    idPrefix: "utm-same-group-materialized",
                    trueColor: [99, 102, 241, 235],
                    predictedColor: [129, 140, 248, 235],
                    lineColor: [99, 102, 241, 115]
                  }
                )
              : []),
            ...(hasSameGroupMaterializedSamples && sameGroupNeighbors
              ? sameGroupNeighborContextLayers(utmSameGroupMaterializedSamples, {
                  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
                  idPrefix: "utm-same-group-neighbor-context"
                })
              : [])
          ]
        : [],
    [
      baseMap,
      hasMaterializedSamples,
      hasSameGroupMaterializedSamples,
      layerSettings,
      materializedPredictedIdSet,
      onSelectMaterializedSample,
      onSelectSample,
      sameGroupNeighbors,
      sameGroupPredictedIdSet,
      selectedMaterializedSampleId,
      utmData,
      utmDisplaySamples,
      utmMaterializedSamples,
      utmSameGroupMaterializedSamples,
      utmNaturalEarthLines
    ]
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
