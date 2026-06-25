import { PolygonLayer } from "@deck.gl/layers";
import type { PickingInfo, Position } from "@deck.gl/core";
import type { SampleRecord } from "../data/schema";
import type { LayerSettings } from "../state/useAppState";
import { geodesicCircle } from "../data/projection";
import { colorForSample, PRED_COLOR } from "./colors";

type CircleDatum = SampleRecord & { polygon: Position[] };

export function uncertaintyLayer(
  samples: SampleRecord[],
  settings: LayerSettings,
  onClick: (sample: SampleRecord) => void
) {
  if (!settings.uncertainty) {
    return new PolygonLayer<CircleDatum>({
      id: "uncertainty-circles",
      data: [],
      visible: false
    });
  }

  const data: CircleDatum[] = samples
    .filter((sample) => sample.sigma_final !== undefined)
    .slice(0, 20000)
    .map((sample) => ({
      ...sample,
      polygon: geodesicCircle(
        sample.pred_lon,
        sample.pred_lat,
        (sample.sigma_final ?? 0) * settings.uncertaintyMultiplier,
        40
      )
    }));

  return new PolygonLayer<CircleDatum>({
    id: "uncertainty-circles",
    data,
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
