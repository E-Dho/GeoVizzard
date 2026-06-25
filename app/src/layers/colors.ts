import type { ColorMode } from "../state/useAppState";
import type { SampleRecord } from "../data/schema";

export const TRUE_COLOR: [number, number, number] = [41, 121, 255];
export const PRED_COLOR: [number, number, number] = [232, 92, 63];
export const SELECTED_COLOR: [number, number, number] = [255, 214, 10];

export const palette: [number, number, number][] = [
  [41, 121, 255],
  [232, 92, 63],
  [45, 166, 92],
  [140, 82, 255],
  [247, 181, 0],
  [0, 153, 184],
  [214, 51, 132],
  [100, 116, 139]
];

function hashString(value = "") {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function categoryColor(value?: string) {
  return palette[hashString(value) % palette.length];
}

function ramp(value: number | undefined, min: number, max: number): [number, number, number] {
  if (value === undefined || min === max) return [100, 116, 139];
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)));
  return [Math.round(39 + 216 * t), Math.round(174 - 124 * t), Math.round(96 - 54 * t)];
}

export function extent(samples: SampleRecord[], accessor: (sample: SampleRecord) => number | undefined) {
  const values = samples.map(accessor).filter((value): value is number => value !== undefined);
  return values.length ? [Math.min(...values), Math.max(...values)] : [0, 1];
}

export function extentForColorMode(mode: ColorMode, samples: SampleRecord[]) {
  if (mode === "error_km") return extent(samples, (sample) => sample.error_km);
  if (mode === "alpha_precision") return extent(samples, (sample) => sample.alpha_precision);
  if (mode === "age_bp") return extent(samples, (sample) => sample.age_bp);
  return undefined;
}

export function colorForSample(
  sample: SampleRecord,
  mode: ColorMode,
  samples: SampleRecord[],
  fallback: [number, number, number],
  opacity = 1,
  colorExtent = extentForColorMode(mode, samples)
) {
  let rgb = fallback;
  if (mode === "error_km") {
    const [min, max] = colorExtent ?? [0, 1];
    rgb = ramp(sample.error_km, min, max);
  } else if (mode === "alpha_precision") {
    const [min, max] = colorExtent ?? [0, 1];
    rgb = ramp(sample.alpha_precision, min, max);
  } else if (mode === "age_bp") {
    const [min, max] = colorExtent ?? [0, 1];
    rgb = ramp(sample.age_bp, min, max);
  } else if (mode === "group") {
    rgb = categoryColor(sample.group);
  } else if (mode === "sequencing_type") {
    rgb = categoryColor(sample.sequencing_type);
  }
  return [...rgb, Math.round(255 * sample.temporalAlpha * opacity)] as [number, number, number, number];
}
