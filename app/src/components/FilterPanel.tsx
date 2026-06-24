import type { DatasetMetadata, SampleRecord } from "../data/schema";
import type { Filters } from "../data/filters";

type Props = {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  metadata: DatasetMetadata;
  samples: SampleRecord[];
};

function numericValue(value: string) {
  return value === "" ? undefined : Number(value);
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

export function FilterPanel({ filters, setFilters, metadata, samples }: Props) {
  const hasSigma = samples.some((sample) => sample.sigma_final !== undefined);
  const hasError = samples.some((sample) => sample.error_km !== undefined);
  const hasAlpha = samples.some((sample) => sample.alpha_precision !== undefined);
  const patch = (partial: Partial<Filters>) => setFilters((current) => ({ ...current, ...partial }));
  const patchBbox = (partial: Partial<Filters["bbox"]>) =>
    setFilters((current) => ({ ...current, bbox: { ...current.bbox, ...partial } }));

  return (
    <section className="panel-section">
      <h2>Filters</h2>
      <div className="metric-row">
        <span>Filtered: {samples.length}</span>
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
      {hasSigma && (
        <div className="two-col">
          <label>
            Sigma min
            <input type="number" value={filters.sigmaFinal.min ?? ""} onChange={(e) => patch({ sigmaFinal: { ...filters.sigmaFinal, min: numericValue(e.target.value) } })} />
          </label>
          <label>
            Sigma max
            <input type="number" value={filters.sigmaFinal.max ?? ""} onChange={(e) => patch({ sigmaFinal: { ...filters.sigmaFinal, max: numericValue(e.target.value) } })} />
          </label>
        </div>
      )}
      {hasError && (
        <div className="two-col">
          <label>
            Error min
            <input type="number" value={filters.errorKm.min ?? ""} onChange={(e) => patch({ errorKm: { ...filters.errorKm, min: numericValue(e.target.value) } })} />
          </label>
          <label>
            Error max
            <input type="number" value={filters.errorKm.max ?? ""} onChange={(e) => patch({ errorKm: { ...filters.errorKm, max: numericValue(e.target.value) } })} />
          </label>
        </div>
      )}
      {hasAlpha && (
        <div className="two-col">
          <label>
            Alpha min
            <input type="number" value={filters.alphaPrecision.min ?? ""} onChange={(e) => patch({ alphaPrecision: { ...filters.alphaPrecision, min: numericValue(e.target.value) } })} />
          </label>
          <label>
            Alpha max
            <input type="number" value={filters.alphaPrecision.max ?? ""} onChange={(e) => patch({ alphaPrecision: { ...filters.alphaPrecision, max: numericValue(e.target.value) } })} />
          </label>
        </div>
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
