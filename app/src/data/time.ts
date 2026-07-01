import type { SampleRecord } from "./schema";

export type FadeCurve = "linear" | "exponential" | "step";

export type TimeSettings = {
  centerAgeBp: number;
  windowWidthYears: number;
  snapToAvailableDates: boolean;
  temporalFadeEnabled: boolean;
  fadeOlderOnly: boolean;
  fadeLookbackYears: number;
  minimumFadedAlpha: number;
  currentWindowAlpha: number;
  fadeCurve: FadeCurve;
  fadeStrength: number;
};

export const defaultTimeSettings: TimeSettings = {
  centerAgeBp: 3200,
  windowWidthYears: 500,
  snapToAvailableDates: true,
  temporalFadeEnabled: true,
  fadeOlderOnly: true,
  fadeLookbackYears: 100,
  minimumFadedAlpha: 0.1,
  currentWindowAlpha: 0.95,
  fadeCurve: "exponential",
  fadeStrength: 4
};

export function nearestAge(age: number, availableAges: number[]) {
  if (!availableAges.length) return age;
  return availableAges.reduce((best, candidate) =>
    Math.abs(candidate - age) < Math.abs(best - age) ? candidate : best
  );
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function visibleWindow(settings: TimeSettings, ageExtent: [number, number]) {
  const half = settings.windowWidthYears / 2;
  return {
    start: clamp(settings.centerAgeBp - half, ageExtent[0], ageExtent[1]),
    end: clamp(settings.centerAgeBp + half, ageExtent[0], ageExtent[1])
  };
}

function interpolateAlpha(settings: TimeSettings, t: number) {
  const clamped = clamp(t, 0, 1);
  if (settings.fadeCurve === "step") {
    return clamped < 1 ? settings.minimumFadedAlpha : 0;
  }
  if (settings.fadeCurve === "exponential") {
    return (
      settings.minimumFadedAlpha +
      (settings.currentWindowAlpha - settings.minimumFadedAlpha) *
        Math.exp(-settings.fadeStrength * clamped)
    );
  }
  return (
    settings.currentWindowAlpha * (1 - clamped) +
    settings.minimumFadedAlpha * clamped
  );
}

export function temporalAlpha(ageBp: number, settings: TimeSettings, ageExtent: [number, number]) {
  const { start, end } = visibleWindow(settings, ageExtent);
  const inside = ageBp >= start && ageBp <= end;
  if (!settings.temporalFadeEnabled) {
    return { alpha: inside ? settings.currentWindowAlpha : 0, inPrimaryWindow: inside };
  }
  if (inside) return { alpha: settings.currentWindowAlpha, inPrimaryWindow: true };

  if (settings.fadeOlderOnly) {
    if (ageBp < start) return { alpha: 0, inPrimaryWindow: false };
    if (ageBp > end + settings.fadeLookbackYears) return { alpha: 0, inPrimaryWindow: false };
    return {
      alpha: interpolateAlpha(settings, (ageBp - end) / settings.fadeLookbackYears),
      inPrimaryWindow: false
    };
  }

  const half = settings.windowWidthYears / 2;
  const distanceOutside = Math.max(0, Math.abs(ageBp - settings.centerAgeBp) - half);
  if (distanceOutside > settings.fadeLookbackYears) {
    return { alpha: 0, inPrimaryWindow: false };
  }
  return {
    alpha: interpolateAlpha(settings, distanceOutside / settings.fadeLookbackYears),
    inPrimaryWindow: false
  };
}

export function applyTemporalAlpha(
  samples: SampleRecord[],
  settings: TimeSettings,
  ageExtent: [number, number]
) {
  return samples
    .map((sample) => {
      const result = temporalAlpha(sample.age_bp, settings, ageExtent);
      return { ...sample, temporalAlpha: result.alpha, inPrimaryWindow: result.inPrimaryWindow };
    })
    .filter((sample) => sample.temporalAlpha > 0);
}
