import { ScatterplotLayer } from "@deck.gl/layers";
import type { PickingInfo } from "@deck.gl/core";
import type { SampleRecord } from "../data/schema";
import type { LayerSettings } from "../state/useAppState";
import { colorForSample, TRUE_COLOR } from "./colors";

export function trueLocationLayer(
  samples: SampleRecord[],
  settings: LayerSettings,
  onClick: (sample: SampleRecord) => void
) {
  return new ScatterplotLayer<SampleRecord>({
    id: "true-locations",
    data: samples,
    visible: settings.trueLocations,
    pickable: true,
    radiusUnits: "pixels",
    getRadius: 5,
    stroked: true,
    lineWidthUnits: "pixels",
    getLineWidth: 1,
    getPosition: (sample) => [sample.true_lon, sample.true_lat],
    getFillColor: (sample) =>
      colorForSample(sample, settings.pointColorMode, samples, TRUE_COLOR, settings.trueOpacity),
    getLineColor: [255, 255, 255, 160],
    onClick: (info: PickingInfo<SampleRecord>) => info.object && onClick(info.object),
    updateTriggers: {
      getFillColor: [settings.pointColorMode, settings.trueOpacity, samples.length]
    }
  });
}
