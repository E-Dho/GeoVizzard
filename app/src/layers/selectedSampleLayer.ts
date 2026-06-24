import { LineLayer, ScatterplotLayer, PolygonLayer } from "@deck.gl/layers";
import type { Position } from "@deck.gl/core";
import type { SampleRecord, NeighborInfo } from "../data/schema";
import type { LayerSettings } from "../state/useAppState";
import { geodesicCircle } from "../data/projection";
import { SELECTED_COLOR } from "./colors";

type SelectedPoint = { kind: "true" | "predicted"; lon: number; lat: number };
type NeighborPoint = NeighborInfo & { lon: number; lat: number };

export function selectedSampleLayer(sample: SampleRecord | undefined, settings: LayerSettings) {
  if (!sample || !settings.selectedSample) return [];
  const points: SelectedPoint[] = [
    { kind: "true", lon: sample.true_lon, lat: sample.true_lat },
    { kind: "predicted", lon: sample.pred_lon, lat: sample.pred_lat }
  ];
  const neighbours: NeighborPoint[] =
    settings.neighbours && sample.neighbors
      ? sample.neighbors.filter((n): n is NeighborPoint => n.lat !== undefined && n.lon !== undefined)
      : [];
  const selectedCircle =
    sample.sigma_final !== undefined
      ? [
          new PolygonLayer<{ polygon: Position[] }>({
            id: "selected-uncertainty",
            data: [
              {
                polygon: geodesicCircle(
                  sample.pred_lon,
                  sample.pred_lat,
                  sample.sigma_final * settings.uncertaintyMultiplier,
                  56
                )
              }
            ],
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
      id: "selected-arrow",
      data: [sample],
      getSourcePosition: (s) => [s.true_lon, s.true_lat],
      getTargetPosition: (s) => [s.pred_lon, s.pred_lat],
      getColor: [255, 214, 10, 230],
      getWidth: 4,
      widthUnits: "pixels"
    }),
    new ScatterplotLayer<SelectedPoint>({
      id: "selected-points",
      data: points,
      getPosition: (point) => [point.lon, point.lat],
      radiusUnits: "pixels",
      getRadius: (point) => (point.kind === "true" ? 9 : 11),
      getFillColor: [255, 214, 10, 235],
      stroked: true,
      getLineColor: [20, 20, 20, 220],
      getLineWidth: 2,
      lineWidthUnits: "pixels"
    }),
    new ScatterplotLayer<NeighborPoint>({
      id: "neighbor-points",
      data: neighbours,
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
      id: "neighbor-lines",
      data: neighbours,
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
