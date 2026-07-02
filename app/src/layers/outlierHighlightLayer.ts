import { ScatterplotLayer } from "@deck.gl/layers";
import type { CoordinateSystem, PickingInfo } from "@deck.gl/core";
import type { SampleRecord } from "../data/schema";
import type { LayerSettings } from "../state/useAppState";

type OutlierPoint = SampleRecord & {
  highlight_lon: number;
  highlight_lat: number;
  highlight_kind: "true" | "predicted";
};

export function outlierHighlightLayer(
  samples: SampleRecord[],
  settings: LayerSettings,
  onClick: (sample: SampleRecord) => void,
  options: { coordinateSystem?: CoordinateSystem; id?: string } = {}
) {
  const data: OutlierPoint[] = settings.potentialOutliers
    ? samples
        .filter((sample) => sample.potential_outlier)
        .flatMap((sample) => [
          {
            ...sample,
            highlight_lon: sample.true_lon,
            highlight_lat: sample.true_lat,
            highlight_kind: "true" as const
          },
          {
            ...sample,
            highlight_lon: sample.pred_lon,
            highlight_lat: sample.pred_lat,
            highlight_kind: "predicted" as const
          }
        ])
    : [];

  return new ScatterplotLayer<OutlierPoint>({
    id: options.id ?? "potential-outlier-highlight",
    data,
    ...(options.coordinateSystem !== undefined ? { coordinateSystem: options.coordinateSystem } : {}),
    visible: settings.potentialOutliers,
    pickable: true,
    radiusUnits: "pixels",
    getRadius: (sample) => (sample.highlight_kind === "predicted" ? 10 : 8),
    stroked: true,
    filled: true,
    lineWidthUnits: "pixels",
    getLineWidth: 2.5,
    getPosition: (sample) => [sample.highlight_lon, sample.highlight_lat],
    getFillColor: [255, 191, 0, 46],
    getLineColor: [245, 158, 11, 235],
    onClick: (info: PickingInfo<OutlierPoint>) => info.object && onClick(info.object),
    updateTriggers: {
      getRadius: [settings.potentialOutliers]
    }
  });
}
