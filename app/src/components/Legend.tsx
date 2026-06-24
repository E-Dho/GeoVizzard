import type { DatasetMetadata, SampleRecord } from "../data/schema";
import type { LayerSettings } from "../state/useAppState";

type Props = {
  samples: SampleRecord[];
  metadata: DatasetMetadata;
  settings: LayerSettings;
};

export function Legend({ samples, metadata, settings }: Props) {
  const errorValues = samples.map((s) => s.error_km).filter((v): v is number => v !== undefined);
  const alphaValues = samples.map((s) => s.alpha_precision).filter((v): v is number => v !== undefined);
  const minError = errorValues.length ? Math.min(...errorValues) : undefined;
  const maxError = errorValues.length ? Math.max(...errorValues) : undefined;
  const minAlpha = alphaValues.length ? Math.min(...alphaValues) : undefined;
  const maxAlpha = alphaValues.length ? Math.max(...alphaValues) : undefined;

  return (
    <section className="legend">
      <h2>Legend</h2>
      <div className="legend-row"><span className="swatch true" />True locations</div>
      <div className="legend-row"><span className="swatch pred" />Predicted locations</div>
      {settings.heatmap && <div className="heatbar" title="Heatmap intensity" />}
      {settings.arrowColorMode === "error_km" && minError !== undefined && (
        <div className="legend-row">Error color: {minError.toFixed(0)}-{maxError?.toFixed(0)} km</div>
      )}
      {settings.arrowColorMode === "alpha_precision" && minAlpha !== undefined && (
        <div className="legend-row">Alpha precision: {minAlpha.toFixed(2)}-{maxAlpha?.toFixed(2)}</div>
      )}
      {settings.arrowColorMode === "age_bp" && (
        <div className="legend-row">Age: {metadata.ageExtent[0]}-{metadata.ageExtent[1]} BP</div>
      )}
      {(settings.pointColorMode === "group" || settings.arrowColorMode === "group") && metadata.groups.length > 0 && (
        <div className="chips">{metadata.groups.slice(0, 12).map((group) => <span key={group}>{group}</span>)}</div>
      )}
      {(settings.pointColorMode === "sequencing_type" || settings.arrowColorMode === "sequencing_type") && metadata.sequencingTypes.length > 0 && (
        <div className="chips">{metadata.sequencingTypes.map((type) => <span key={type}>{type}</span>)}</div>
      )}
    </section>
  );
}
