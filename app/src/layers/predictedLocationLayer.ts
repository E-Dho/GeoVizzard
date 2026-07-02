import { ScatterplotLayer } from "@deck.gl/layers";
import type { CoordinateSystem, PickingInfo } from "@deck.gl/core";
import type { SampleRecord } from "../data/schema";
import type { LayerSettings } from "../state/useAppState";
import { colorForSample, extentForColorMode, PRED_COLOR } from "./colors";

export function predictedLocationLayer(
  samples: SampleRecord[],
  settings: LayerSettings,
  onClick: (sample: SampleRecord) => void,
  options: { coordinateSystem?: CoordinateSystem; id?: string } = {}
) {
  const colorExtent = extentForColorMode(settings.pointColorMode, samples);
  return new ScatterplotLayer<SampleRecord>({
    id: options.id ?? "predicted-locations",
    data: samples,
    ...(options.coordinateSystem !== undefined ? { coordinateSystem: options.coordinateSystem } : {}),
    visible: settings.predictedLocations,
    pickable: true,
    radiusUnits: "pixels",
    getRadius: 5,
    stroked: true,
    lineWidthUnits: "pixels",
    getLineWidth: 1,
    getPosition: (sample) => [sample.pred_lon, sample.pred_lat],
    getFillColor: (sample) =>
      colorForSample(sample, settings.pointColorMode, samples, PRED_COLOR, settings.predictedOpacity, colorExtent),
    getLineColor: [255, 255, 255, 160],
    onClick: (info: PickingInfo<SampleRecord>) => info.object && onClick(info.object),
    updateTriggers: {
      getFillColor: [settings.pointColorMode, settings.predictedOpacity, samples.length]
    }
  });
}
