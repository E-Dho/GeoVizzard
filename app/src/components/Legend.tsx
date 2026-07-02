import { memo } from "react";
import type { ReactNode } from "react";
import type { ColorMode, LayerSettings } from "../state/useAppState";
import type { DatasetMetadata, SampleRecord } from "../data/schema";
import { categoryColor, COMPARISON_COLOR, PRED_COLOR, TRUE_COLOR } from "../layers/colors";

type Props = {
  samples: SampleRecord[];
  allSamples: SampleRecord[];
  metadata: DatasetMetadata;
  settings: LayerSettings;
};

function numericExtent(
  samples: SampleRecord[],
  accessor: (sample: SampleRecord) => number | undefined
) {
  const values = samples.map(accessor).filter((value): value is number => value !== undefined);
  if (!values.length) return undefined;
  return { min: Math.min(...values), max: Math.max(...values) };
}

function formatNumber(value: number) {
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function Swatch({ color }: { color: [number, number, number] }) {
  return (
    <span
      className="swatch"
      style={{ background: `rgb(${color[0]}, ${color[1]}, ${color[2]})` }}
    />
  );
}

function ColorRamp({ label, min, max, suffix = "" }: { label: string; min: number; max: number; suffix?: string }) {
  return (
    <div className="legend-scale">
      <span>{label}</span>
      <div className="colorbar" />
      <div className="scale-labels">
        <span>
          {formatNumber(min)}
          {suffix}
        </span>
        <span>
          {formatNumber(max)}
          {suffix}
        </span>
      </div>
    </div>
  );
}

function CategoryChips({ values }: { values: string[] }) {
  if (!values.length) return <p className="muted">No categories available.</p>;
  return (
    <div className="chips">
      {values.slice(0, 16).map((value) => (
        <span key={value}>
          <Swatch color={categoryColor(value)} />
          {value}
        </span>
      ))}
      {values.length > 16 && <span>+{values.length - 16} more</span>}
    </div>
  );
}

const ModeLegend = memo(function ModeLegend({
  title,
  mode,
  samples,
  allSamples,
  metadata,
  constantContent
}: {
  title: string;
  mode: ColorMode;
  samples: SampleRecord[];
  allSamples: SampleRecord[];
  metadata: DatasetMetadata;
  constantContent: ReactNode;
}) {
  const referenceSamples = samples.length ? samples : allSamples;
  const errorRange = numericExtent(referenceSamples, (sample) => sample.error_km);
  const alphaRange = numericExtent(referenceSamples, (sample) => sample.alpha_precision);
  const ageRange = samples.length
    ? numericExtent(samples, (sample) => sample.age_bp)
    : { min: metadata.ageExtent[0], max: metadata.ageExtent[1] };

  return (
    <div className="legend-group">
      <h3>{title}</h3>
      {mode === "constant" && constantContent}
      {mode === "group" && (
        <>
          <div className="legend-row">Colored by group</div>
          <CategoryChips values={metadata.groups} />
        </>
      )}
      {mode === "sequencing_type" && (
        <>
          <div className="legend-row">Colored by sequencing type</div>
          <CategoryChips values={metadata.sequencingTypes} />
        </>
      )}
      {mode === "age_bp" && ageRange && (
        <ColorRamp label="Colored by age BP" min={ageRange.min} max={ageRange.max} suffix=" BP" />
      )}
      {mode === "error_km" && errorRange && (
        <ColorRamp label="Colored by prediction error" min={errorRange.min} max={errorRange.max} suffix=" km" />
      )}
      {mode === "alpha_precision" && alphaRange && (
        <ColorRamp label="Colored by alpha precision" min={alphaRange.min} max={alphaRange.max} />
      )}
    </div>
  );
});

function LegendComponent({ samples, allSamples, metadata, settings }: Props) {
  const hasComparisonSamples = samples.some((sample) => sample.inComparisonWindow);
  return (
    <section className="legend">
      <h2>Legend</h2>
      {hasComparisonSamples && (
        <div className="legend-row">
          <Swatch color={COMPARISON_COLOR} />
          Comparison window samples
        </div>
      )}
      <ModeLegend
        title="Points"
        mode={settings.pointColorMode}
        samples={samples}
        allSamples={allSamples}
        metadata={metadata}
        constantContent={
          <>
            <div className="legend-row">
              <Swatch color={TRUE_COLOR} />
              True locations
            </div>
            <div className="legend-row">
              <Swatch color={PRED_COLOR} />
              Predicted locations
            </div>
          </>
        }
      />
      <ModeLegend
        title="Arrows"
        mode={settings.arrowColorMode}
        samples={samples}
        allSamples={allSamples}
        metadata={metadata}
        constantContent={<div className="legend-row">Constant gray true-to-predicted lines</div>}
      />
      {settings.heatmap && (
        <div className="legend-group">
          <h3>Heatmap</h3>
          <div className="heatbar" title="Heatmap intensity" />
          <div className="legend-row">Higher intensity indicates denser weighted predictions.</div>
        </div>
      )}
    </section>
  );
}

export const Legend = memo(LegendComponent);
