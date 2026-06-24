import type { SampleRecord } from "./schema";

export function heatmapWeight(sample: SampleRecord, useSigma: boolean) {
  const sigma = sample.sigma_final;
  const sigmaWeight = useSigma && sigma && sigma > 0 ? 1 / sigma : 1;
  return sigmaWeight * sample.temporalAlpha;
}
