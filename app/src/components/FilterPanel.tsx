import { Info } from "lucide-react";
import type { DatasetMetadata, SampleRecord } from "../data/schema";
import type { Filters } from "../data/filters";

type Props = {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  metadata: DatasetMetadata;
  filteredSamples: SampleRecord[];
  allSamples: SampleRecord[];
};

function numericValue(value: string) {
  if (value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function MultiSelect({
  label,
  values,
  selected,
  onChange
}: {
  label: string;
  values: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  if (!values.length) return null;
  return (
    <label>
      {label}
      <select
        multiple
        value={selected}
        onChange={(event) =>
          onChange(Array.from(event.currentTarget.selectedOptions).map((option) => option.value))
        }
      >
        {values.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </label>
  );
}

function numericExtent(samples: SampleRecord[], accessor: (sample: SampleRecord) => number | undefined) {
  const values = samples.map(accessor).filter((value): value is number => value !== undefined);
  if (!values.length) return undefined;
  return { min: Math.min(...values), max: Math.max(...values) };
}

function formatRange(range: { min: number; max: number } | undefined, suffix = "") {
  if (!range) return "No values available in this dataset.";
  const min = Number(range.min.toFixed(3));
  const max = Number(range.max.toFixed(3));
  return `Available range: ${min}-${max}${suffix}`;
}

function NumericFilter({
  label,
  range,
  suffix,
  min,
  max,
  onMin,
  onMax
}: {
  label: string;
  range: { min: number; max: number } | undefined;
  suffix?: string;
  min?: number;
  max?: number;
  onMin: (value: number | undefined) => void;
  onMax: (value: number | undefined) => void;
}) {
  const hint = formatRange(range, suffix);
  return (
    <div className="numeric-filter">
      <div className="filter-label">
        <span>{label}</span>
        <span className="info-dot" title={hint} aria-label={hint}>
          <Info size={13} />
        </span>
      </div>
      <div className="two-col">
        <label>
          Min
          <input
            type="number"
            value={min ?? ""}
            placeholder={range ? String(Number(range.min.toFixed(3))) : ""}
            title={hint}
            onChange={(event) => onMin(numericValue(event.target.value))}
          />
        </label>
        <label>
          Max
          <input
            type="number"
            value={max ?? ""}
            placeholder={range ? String(Number(range.max.toFixed(3))) : ""}
            title={hint}
            onChange={(event) => onMax(numericValue(event.target.value))}
          />
        </label>
      </div>
    </div>
  );
}

export function FilterPanel({ filters, setFilters, metadata, filteredSamples, allSamples }: Props) {
  const sigmaRange = numericExtent(allSamples, (sample) => sample.sigma_final);
  const errorRange = numericExtent(allSamples, (sample) => sample.error_km);
  const alphaRange = numericExtent(allSamples, (sample) => sample.alpha_precision);
  const patch = (partial: Partial<Filters>) => setFilters((current) => ({ ...current, ...partial }));
  const patchBbox = (partial: Partial<Filters["bbox"]>) =>
    setFilters((current) => ({ ...current, bbox: { ...current.bbox, ...partial } }));

  return (
    <section className="panel-section">
      <h2>Filters</h2>
      <div className="metric-row">
        <span>Filtered: {filteredSamples.length}</span>
        <span>Total: {metadata.rowCount}</span>
      </div>
      <label>
        Search
        <input
          type="search"
          placeholder="sample, locality, group"
          value={filters.search}
          onChange={(event) => patch({ search: event.target.value })}
        />
      </label>
      <MultiSelect
        label="Group"
        values={metadata.groups}
        selected={filters.groups}
        onChange={(groups) => patch({ groups })}
      />
      <MultiSelect
        label="Sequencing"
        values={metadata.sequencingTypes}
        selected={filters.sequencingTypes}
        onChange={(sequencingTypes) => patch({ sequencingTypes })}
      />
      {sigmaRange && (
        <NumericFilter
          label="Sigma final"
          range={sigmaRange}
          suffix=" km"
          min={filters.sigmaFinal.min}
          max={filters.sigmaFinal.max}
          onMin={(min) => patch({ sigmaFinal: { ...filters.sigmaFinal, min } })}
          onMax={(max) => patch({ sigmaFinal: { ...filters.sigmaFinal, max } })}
        />
      )}
      {errorRange && (
        <NumericFilter
          label="Error"
          range={errorRange}
          suffix=" km"
          min={filters.errorKm.min}
          max={filters.errorKm.max}
          onMin={(min) => patch({ errorKm: { ...filters.errorKm, min } })}
          onMax={(max) => patch({ errorKm: { ...filters.errorKm, max } })}
        />
      )}
      {alphaRange && (
        <NumericFilter
          label="Alpha precision"
          range={alphaRange}
          min={filters.alphaPrecision.min}
          max={filters.alphaPrecision.max}
          onMin={(min) => patch({ alphaPrecision: { ...filters.alphaPrecision, min } })}
          onMax={(max) => patch({ alphaPrecision: { ...filters.alphaPrecision, max } })}
        />
      )}
      <label className="check">
        <input
          type="checkbox"
          checked={filters.bbox.enabled}
          onChange={(event) => patchBbox({ enabled: event.target.checked })}
        />
        Coordinate bounding box
      </label>
      <div className="two-col">
        <label>
          Min lon
          <input type="number" value={filters.bbox.minLon} onChange={(e) => patchBbox({ minLon: Number(e.target.value) })} />
        </label>
        <label>
          Max lon
          <input type="number" value={filters.bbox.maxLon} onChange={(e) => patchBbox({ maxLon: Number(e.target.value) })} />
        </label>
        <label>
          Min lat
          <input type="number" value={filters.bbox.minLat} onChange={(e) => patchBbox({ minLat: Number(e.target.value) })} />
        </label>
        <label>
          Max lat
          <input type="number" value={filters.bbox.maxLat} onChange={(e) => patchBbox({ maxLat: Number(e.target.value) })} />
        </label>
      </div>
      <label>
        Coordinate basis
        <select value={filters.bbox.basis} onChange={(e) => patchBbox({ basis: e.target.value as Filters["bbox"]["basis"] })}>
          <option value="true">True location</option>
          <option value="predicted">Predicted location</option>
          <option value="either">Either endpoint</option>
        </select>
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={filters.selectedOnly}
          onChange={(event) => patch({ selectedOnly: event.target.checked })}
        />
        Show only selected sample
      </label>
    </section>
  );
}
