import { LineLayer, PolygonLayer, ScatterplotLayer } from "@deck.gl/layers";
import { COORDINATE_SYSTEM } from "@deck.gl/core";
import type { PickingInfo, Position } from "@deck.gl/core";
import type { NeighborInfo, SampleRecord } from "../data/schema";
import type { LayerSettings } from "../state/useAppState";
import { colorForSample, PRED_COLOR } from "./colors";

type CircleDatum = SampleRecord & { polygon: Position[] };
type SelectedPoint = { kind: "true" | "predicted"; x: number; y: number };
type NeighborPoint = NeighborInfo & { lon: number; lat: number };

function metricCircle(x: number, y: number, radiusMeters: number, steps = 48): Position[] {
  return Array.from({ length: steps }, (_, index) => {
    const angle = (Math.PI * 2 * index) / steps;
    return [x + Math.cos(angle) * radiusMeters, y + Math.sin(angle) * radiusMeters];
  });
}

export function utmUncertaintyLayer(
  samples: SampleRecord[],
  settings: LayerSettings,
  onClick: (sample: SampleRecord) => void
) {
  if (!settings.uncertainty) {
    return new PolygonLayer<CircleDatum>({
      id: "utm-uncertainty-circles",
      data: [],
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      visible: false
    });
  }

  const data: CircleDatum[] = samples
    .filter((sample) => sample.sigma_final !== undefined)
    .slice(0, 20000)
    .map((sample) => ({
      ...sample,
      polygon: metricCircle(
        sample.pred_lon,
        sample.pred_lat,
        (sample.sigma_final ?? 0) * 1000 * settings.uncertaintyMultiplier,
        48
      )
    }));

  return new PolygonLayer<CircleDatum>({
    id: "utm-uncertainty-circles",
    data,
    coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
    visible: true,
    pickable: true,
    getPolygon: (sample) => sample.polygon,
    getFillColor: (sample) =>
      colorForSample(sample, "constant", samples, PRED_COLOR, settings.uncertaintyOpacity),
    getLineColor: [120, 120, 120, 90],
    lineWidthUnits: "pixels",
    getLineWidth: 0.5,
    onClick: (info: PickingInfo<CircleDatum>) => info.object && onClick(info.object),
    updateTriggers: {
      getFillColor: [settings.uncertaintyOpacity],
      getPolygon: [settings.uncertaintyMultiplier]
    }
  });
}

export function utmSelectedSampleLayer(
  sample: SampleRecord | undefined,
  settings: LayerSettings
) {
  if (!sample || !settings.selectedSample) return [];

  const points: SelectedPoint[] = [
    { kind: "true", x: sample.true_lon, y: sample.true_lat },
    { kind: "predicted", x: sample.pred_lon, y: sample.pred_lat }
  ];
  const neighbours: NeighborPoint[] =
    settings.neighbours && sample.neighbors
      ? sample.neighbors.filter((n): n is NeighborPoint => n.lat !== undefined && n.lon !== undefined)
      : [];
  const selectedCircle =
    sample.sigma_final !== undefined
      ? [
          new PolygonLayer<{ polygon: Position[] }>({
            id: "utm-selected-uncertainty",
            data: [
              {
                polygon: metricCircle(
                  sample.pred_lon,
                  sample.pred_lat,
                  sample.sigma_final * 1000 * settings.uncertaintyMultiplier,
                  56
                )
              }
            ],
            coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
            visible: settings.uncertainty || settings.selectedDensityOnly,
            getPolygon: (d) => d.polygon,
            getFillColor: [255, 214, 10, 42],
            getLineColor: [255, 214, 10, 220],
            getLineWidth: 2,
            lineWidthUnits: "pixels"
          })
        ]
      : [];

  return [
    new LineLayer<SampleRecord>({
      id: "utm-selected-arrow",
      data: [sample],
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      getSourcePosition: (s) => [s.true_lon, s.true_lat],
      getTargetPosition: (s) => [s.pred_lon, s.pred_lat],
      getColor: [255, 214, 10, 230],
      getWidth: 4,
      widthUnits: "pixels"
    }),
    new ScatterplotLayer<SelectedPoint>({
      id: "utm-selected-points",
      data: points,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      getPosition: (point) => [point.x, point.y],
      radiusUnits: "pixels",
      getRadius: (point) => (point.kind === "true" ? 9 : 11),
      getFillColor: [255, 214, 10, 235],
      stroked: true,
      getLineColor: [20, 20, 20, 220],
      getLineWidth: 2,
      lineWidthUnits: "pixels"
    }),
    new ScatterplotLayer<NeighborPoint>({
      id: "utm-neighbor-points",
      data: neighbours,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      visible: settings.neighbours,
      getPosition: (n) => [n.lon, n.lat],
      radiusUnits: "pixels",
      getRadius: 4,
      getFillColor: [20, 184, 166, 220],
      stroked: true,
      getLineColor: [255, 255, 255, 190],
      getLineWidth: 1,
      lineWidthUnits: "pixels"
    }),
    new LineLayer<NeighborPoint>({
      id: "utm-neighbor-lines",
      data: neighbours,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      visible: settings.neighbours,
      getSourcePosition: () => [sample.pred_lon, sample.pred_lat],
      getTargetPosition: (n) => [n.lon, n.lat],
      getColor: [20, 184, 166, 120],
      getWidth: 1,
      widthUnits: "pixels"
    }),
    ...selectedCircle
  ];
}
