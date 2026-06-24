import { HeatmapLayer } from "@deck.gl/aggregation-layers";
import type { SampleRecord } from "../data/schema";
import type { LayerSettings } from "../state/useAppState";
import { heatmapWeight } from "../data/kde";

export function heatmapLayer(samples: SampleRecord[], settings: LayerSettings) {
  const data =
    settings.heatmapSource === "error_endpoints"
      ? samples.flatMap((sample) => [
          { ...sample, lon: sample.true_lon, lat: sample.true_lat },
          { ...sample, lon: sample.pred_lon, lat: sample.pred_lat }
        ])
      : samples.map((sample) => ({
          ...sample,
          lon: settings.heatmapSource === "true" ? sample.true_lon : sample.pred_lon,
          lat: settings.heatmapSource === "true" ? sample.true_lat : sample.pred_lat
        }));

  return new HeatmapLayer<SampleRecord & { lon: number; lat: number }>({
    id: "kde-heatmap",
    data,
    visible: settings.heatmap,
    getPosition: (sample) => [sample.lon, sample.lat],
    getWeight: (sample) => heatmapWeight(sample, settings.heatmapUseSigma),
    radiusPixels: settings.heatmapBandwidth,
    intensity: settings.heatmapIntensity,
    threshold: settings.heatmapThreshold,
    opacity: settings.heatmapOpacity,
    updateTriggers: {
      getWeight: [settings.heatmapUseSigma],
      getPosition: [settings.heatmapSource]
    }
  });
}
