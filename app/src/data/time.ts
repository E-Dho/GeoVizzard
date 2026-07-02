import type { SampleRecord } from "./schema";

export type FadeCurve = "linear" | "exponential" | "step";
export type TimeMode = "center" | "bounds";

export type TimeSettings = {
  timeMode: TimeMode;
  centerAgeBp: number;
  windowWidthYears: number;
  rangeStartAgeBp: number;
  rangeEndAgeBp: number;
  compareWindowEnabled: boolean;
  compareRangeStartAgeBp: number;
  compareRangeEndAgeBp: number;
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
  timeMode: "center",
  centerAgeBp: 3200,
  windowWidthYears: 500,
  rangeStartAgeBp: 2950,
  rangeEndAgeBp: 3450,
  compareWindowEnabled: false,
  compareRangeStartAgeBp: 3950,
  compareRangeEndAgeBp: 4450,
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
  if (settings.timeMode === "bounds") {
    const start = Math.min(settings.rangeStartAgeBp, settings.rangeEndAgeBp);
    const end = Math.max(settings.rangeStartAgeBp, settings.rangeEndAgeBp);
    return {
      start: clamp(start, ageExtent[0], ageExtent[1]),
      end: clamp(end, ageExtent[0], ageExtent[1])
    };
  }
  const half = settings.windowWidthYears / 2;
  return {
    start: clamp(settings.centerAgeBp - half, ageExtent[0], ageExtent[1]),
    end: clamp(settings.centerAgeBp + half, ageExtent[0], ageExtent[1])
  };
}

export function comparisonWindow(settings: TimeSettings, ageExtent: [number, number]) {
  const start = Math.min(settings.compareRangeStartAgeBp, settings.compareRangeEndAgeBp);
  const end = Math.max(settings.compareRangeStartAgeBp, settings.compareRangeEndAgeBp);
  return {
    start: clamp(start, ageExtent[0], ageExtent[1]),
    end: clamp(end, ageExtent[0], ageExtent[1])
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
  const compare = settings.compareWindowEnabled ? comparisonWindow(settings, ageExtent) : undefined;
  const inside = ageBp >= start && ageBp <= end;
  const insideComparison =
    compare !== undefined && ageBp >= compare.start && ageBp <= compare.end && !inside;
  if (!settings.temporalFadeEnabled) {
    return {
      alpha: inside || insideComparison ? settings.currentWindowAlpha : 0,
      inPrimaryWindow: inside,
      inComparisonWindow: insideComparison
    };
  }
  if (inside) {
    return {
      alpha: settings.currentWindowAlpha,
      inPrimaryWindow: true,
      inComparisonWindow: false
    };
  }
  if (insideComparison) {
    return {
      alpha: settings.currentWindowAlpha,
      inPrimaryWindow: false,
      inComparisonWindow: true
    };
  }

  if (settings.fadeOlderOnly) {
    if (ageBp < start) {
      return { alpha: 0, inPrimaryWindow: false, inComparisonWindow: false };
    }
    if (ageBp > end + settings.fadeLookbackYears) {
      return { alpha: 0, inPrimaryWindow: false, inComparisonWindow: false };
    }
    return {
      alpha: interpolateAlpha(settings, (ageBp - end) / settings.fadeLookbackYears),
      inPrimaryWindow: false,
      inComparisonWindow: false
    };
  }

  const distanceOutside = ageBp < start ? start - ageBp : ageBp - end;
  if (distanceOutside > settings.fadeLookbackYears) {
    return { alpha: 0, inPrimaryWindow: false, inComparisonWindow: false };
  }
  return {
    alpha: interpolateAlpha(settings, distanceOutside / settings.fadeLookbackYears),
    inPrimaryWindow: false,
    inComparisonWindow: false
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
      return {
        ...sample,
        temporalAlpha: result.alpha,
        inPrimaryWindow: result.inPrimaryWindow,
        inComparisonWindow: result.inComparisonWindow
      };
    })
    .filter((sample) => sample.temporalAlpha > 0);
}
