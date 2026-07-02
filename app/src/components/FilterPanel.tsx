import { CircleHelp } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
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

function clipNumber(value: number | undefined, min?: number, max?: number) {
  if (value === undefined) return undefined;
  if (min !== undefined && value < min) return min;
  if (max !== undefined && value > max) return max;
  return value;
}

function formatDraftValue(value: number | undefined) {
  return value === undefined ? "" : String(value);
}

const DraftNumberInput = memo(function DraftNumberInput({
  value,
  placeholder,
  title,
  clipMin,
  clipMax,
  emptyFallback,
  onCommit
}: {
  value: number | undefined;
  placeholder?: string;
  title?: string;
  clipMin?: number;
  clipMax?: number;
  emptyFallback?: number;
  onCommit: (value: number | undefined) => void;
}) {
  const [draft, setDraft] = useState(formatDraftValue(value));

  useEffect(() => {
    setDraft(formatDraftValue(value));
  }, [value]);

  const commit = () => {
    const parsed = numericValue(draft.trim()) ?? emptyFallback;
    const clipped = clipNumber(parsed, clipMin, clipMax);
    setDraft(formatDraftValue(clipped));
    onCommit(clipped);
  };

  return (
    <input
      type="number"
      value={draft}
      placeholder={placeholder}
      title={title}
      onBlur={commit}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          setDraft(formatDraftValue(value));
          event.currentTarget.blur();
        }
      }}
    />
  );
});

const TOOLTIP_WIDTH = 230;
const TOOLTIP_MARGIN = 12;

function FilterHelp({ text }: { text: string }) {
  const iconRef = useRef<HTMLSpanElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    placement: "above" | "below";
  }>();

  const showTooltip = () => {
    const rect = iconRef.current?.getBoundingClientRect();
    if (!rect) return;
    const halfWidth = TOOLTIP_WIDTH / 2;
    const x = Math.min(
      window.innerWidth - TOOLTIP_MARGIN - halfWidth,
      Math.max(TOOLTIP_MARGIN + halfWidth, rect.left + rect.width / 2)
    );
    const placement = rect.top < 90 ? "below" : "above";
    setTooltip({
      x,
      y: placement === "above" ? rect.top - 8 : rect.bottom + 8,
      placement
    });
  };

  return (
    <>
      <span
        ref={iconRef}
        className="info-dot"
        aria-label={text}
        tabIndex={0}
        onBlur={() => setTooltip(undefined)}
        onFocus={showTooltip}
        onMouseEnter={showTooltip}
        onMouseLeave={() => setTooltip(undefined)}
      >
        <CircleHelp size={13} />
      </span>
      {tooltip && (
        <span
          className={`info-tooltip ${tooltip.placement}`}
          role="tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            width: `min(${TOOLTIP_WIDTH}px, calc(100vw - ${TOOLTIP_MARGIN * 2}px))`
          }}
        >
          {text}
        </span>
      )}
    </>
  );
}

const CheckboxFilter = memo(function CheckboxFilter({
  label,
  help,
  values,
  selected,
  onChange
}: {
  label: string;
  help: string;
  values: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  if (!values.length) return null;
  const selectedSet = new Set(selected);
  const toggleValue = (value: string, checked: boolean) => {
    if (checked) {
      onChange([...selected, value]);
      return;
    }
    onChange(selected.filter((selectedValue) => selectedValue !== value));
  };

  return (
    <fieldset className="checkbox-filter">
      <legend>
        <span className="filter-label">
          <span>{label}</span>
          <FilterHelp text={help} />
        </span>
        {selected.length > 0 && (
          <button type="button" onClick={() => onChange([])}>
            Clear {selected.length}
          </button>
        )}
      </legend>
      <div className="checkbox-list">
        {values.map((value) => (
          <label key={value} className="check">
            <input
              type="checkbox"
              checked={selectedSet.has(value)}
              onChange={(event) => toggleValue(value, event.target.checked)}
            />
            {value}
          </label>
        ))}
      </div>
    </fieldset>
  );
});

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

const NumericFilter = memo(function NumericFilter({
  label,
  help,
  range,
  suffix,
  min,
  max,
  onMin,
  onMax
}: {
  label: string;
  help: string;
  range: { min: number; max: number } | undefined;
  suffix?: string;
  min?: number;
  max?: number;
  onMin: (value: number | undefined) => void;
  onMax: (value: number | undefined) => void;
}) {
  const hint = `${help} ${formatRange(range, suffix)}`;
  return (
    <div className="numeric-filter">
      <div className="filter-label">
        <span>{label}</span>
        <FilterHelp text={hint} />
      </div>
      <div className="two-col">
        <label>
          Min
          <DraftNumberInput
            value={min}
            placeholder={range ? String(Number(range.min.toFixed(3))) : ""}
            title={hint}
            clipMin={range?.min}
            clipMax={range?.max}
            onCommit={onMin}
          />
        </label>
        <label>
          Max
          <DraftNumberInput
            value={max}
            placeholder={range ? String(Number(range.max.toFixed(3))) : ""}
            title={hint}
            clipMin={range?.min}
            clipMax={range?.max}
            onCommit={onMax}
          />
        </label>
      </div>
    </div>
  );
});

function FilterPanelComponent({ filters, setFilters, metadata, filteredSamples, allSamples }: Props) {
  const sigmaRange = useMemo(
    () => numericExtent(allSamples, (sample) => sample.sigma_final),
    [allSamples]
  );
  const errorRange = useMemo(
    () => numericExtent(allSamples, (sample) => sample.error_km),
    [allSamples]
  );
  const alphaRange = useMemo(
    () => numericExtent(allSamples, (sample) => sample.alpha_precision),
    [allSamples]
  );
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
        <span className="filter-label">
          <span>Search</span>
          <FilterHelp text="Searches sample ID, locality, and group text in the loaded dataset." />
        </span>
        <input
          type="search"
          placeholder="sample, locality, group"
          value={filters.search}
          onChange={(event) => patch({ search: event.target.value })}
        />
      </label>
      <CheckboxFilter
        label="Group"
        help="Keeps only samples whose group matches one of the checked values."
        values={metadata.groups}
        selected={filters.groups}
        onChange={(groups) => patch({ groups })}
      />
      <CheckboxFilter
        label="Sequencing"
        help="Keeps only samples whose sequencing type matches one of the checked values."
        values={metadata.sequencingTypes}
        selected={filters.sequencingTypes}
        onChange={(sequencingTypes) => patch({ sequencingTypes })}
      />
      {sigmaRange && (
        <NumericFilter
          label="Sigma final"
          help="Filters by final prediction uncertainty; lower values are more precise."
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
          help="Filters by prediction error distance between true and predicted locations."
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
          help="Filters by alpha precision values when that field is present in the dataset."
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
        <span>Coordinate bounding box</span>
        <FilterHelp text="Restricts samples to the longitude and latitude range below." />
      </label>
      <div className="two-col">
        <label>
          <span className="filter-label">
            <span>Min lon</span>
            <FilterHelp text="Western edge of the coordinate bounding box." />
          </span>
          <DraftNumberInput
            value={filters.bbox.minLon}
            clipMin={-180}
            clipMax={180}
            emptyFallback={filters.bbox.minLon}
            onCommit={(minLon) => minLon !== undefined && patchBbox({ minLon })}
          />
        </label>
        <label>
          <span className="filter-label">
            <span>Max lon</span>
            <FilterHelp text="Eastern edge of the coordinate bounding box." />
          </span>
          <DraftNumberInput
            value={filters.bbox.maxLon}
            clipMin={-180}
            clipMax={180}
            emptyFallback={filters.bbox.maxLon}
            onCommit={(maxLon) => maxLon !== undefined && patchBbox({ maxLon })}
          />
        </label>
        <label>
          <span className="filter-label">
            <span>Min lat</span>
            <FilterHelp text="Southern edge of the coordinate bounding box." />
          </span>
          <DraftNumberInput
            value={filters.bbox.minLat}
            clipMin={-90}
            clipMax={90}
            emptyFallback={filters.bbox.minLat}
            onCommit={(minLat) => minLat !== undefined && patchBbox({ minLat })}
          />
        </label>
        <label>
          <span className="filter-label">
            <span>Max lat</span>
            <FilterHelp text="Northern edge of the coordinate bounding box." />
          </span>
          <DraftNumberInput
            value={filters.bbox.maxLat}
            clipMin={-90}
            clipMax={90}
            emptyFallback={filters.bbox.maxLat}
            onCommit={(maxLat) => maxLat !== undefined && patchBbox({ maxLat })}
          />
        </label>
      </div>
      <label>
        <span className="filter-label">
          <span>Coordinate basis</span>
          <FilterHelp text="Chooses whether the bounding box is tested against true locations, predicted locations, or either endpoint." />
        </span>
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
        <span>Show only selected sample</span>
        <FilterHelp text="Narrows the current view to the sample selected on the map or in the inspector." />
      </label>
    </section>
  );
}

export const FilterPanel = memo(FilterPanelComponent);
