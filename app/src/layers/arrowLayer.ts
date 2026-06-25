import { LineLayer } from "@deck.gl/layers";
import type { PickingInfo } from "@deck.gl/core";
import type { SampleRecord } from "../data/schema";
import type { LayerSettings } from "../state/useAppState";
import { colorForSample, extentForColorMode } from "./colors";

function sampled(samples: SampleRecord[], limit: number) {
  if (samples.length <= limit) return samples;
  const stride = Math.ceil(samples.length / limit);
  return samples.filter((_, index) => index % stride === 0);
}

export function arrowLayer(
  samples: SampleRecord[],
  settings: LayerSettings,
  onClick: (sample: SampleRecord) => void
) {
  const data = sampled(samples, settings.maxArrows);
  const colorExtent = extentForColorMode(settings.arrowColorMode, samples);
  return new LineLayer<SampleRecord>({
    id: "prediction-arrows",
    data,
    visible: settings.arrows,
    pickable: true,
    getSourcePosition: (sample) => [sample.true_lon, sample.true_lat],
    getTargetPosition: (sample) => [sample.pred_lon, sample.pred_lat],
    getColor: (sample) =>
      colorForSample(sample, settings.arrowColorMode, samples, [71, 85, 105], settings.arrowOpacity, colorExtent),
    getWidth: (sample) =>
      settings.arrowWidthMode === "error_km" ? Math.max(1, Math.min(7, (sample.error_km ?? 0) / 150)) : 1.5,
    widthUnits: "pixels",
    onClick: (info: PickingInfo<SampleRecord>) => info.object && onClick(info.object),
    updateTriggers: {
      getColor: [settings.arrowColorMode, settings.arrowOpacity, samples.length],
      getWidth: [settings.arrowWidthMode]
    }
  });
}
