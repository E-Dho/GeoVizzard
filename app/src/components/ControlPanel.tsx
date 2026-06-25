import { Download, FileJson, Upload } from "lucide-react";
import { FilterPanel } from "./FilterPanel";
import { LayerControls } from "./LayerControls";
import { TimeControls } from "./TimeControls";
import { Legend } from "./Legend";
import type { useAppState } from "../state/useAppState";

type Props = ReturnType<typeof useAppState>;

export function ControlPanel(state: Props) {
  const hasSigma = state.samples.some((sample) => sample.sigma_final !== undefined);
  return (
    <aside className="control-panel">
      <section className="panel-section brand">
        <h1>GeoVizzard</h1>
        <p>{state.sourceName}</p>
        {state.error && <div className="error">{state.error}</div>}
        <label className="file-button">
          <Upload size={16} />
          Load CSV/TSV/Parquet
          <input
            type="file"
            accept=".csv,.tsv,.txt,.parquet"
            onChange={(event) => event.target.files?.[0] && state.loadFile(event.target.files[0])}
          />
        </label>
        <details>
          <summary>Column mapping</summary>
          <textarea
            value={state.schemaText}
            onChange={(event) => state.setSchemaText(event.target.value)}
            spellCheck={false}
          />
        </details>
        <div className="button-row">
          <button onClick={state.exportFilteredCsv}><Download size={15} />CSV</button>
          <button onClick={state.exportSettings}><FileJson size={15} />Settings</button>
          <label className="small-file">
            <Upload size={15} />Load settings
            <input type="file" accept=".json" onChange={(event) => event.target.files?.[0] && state.loadSettings(event.target.files[0])} />
          </label>
        </div>
      </section>
      <TimeControls
        metadata={state.metadata}
        timeSettings={state.timeSettings}
        setTimeSettings={state.setTimeSettings}
        setCenterAge={state.setCenterAge}
        window={state.window}
        primaryWindowCount={state.primaryWindowCount}
      />
      <FilterPanel
        filters={state.filters}
        setFilters={state.setFilters}
        metadata={state.metadata}
        filteredSamples={state.filteredSamples}
        allSamples={state.samples}
      />
      <LayerControls settings={state.layerSettings} setSettings={state.setLayerSettings} hasSigma={hasSigma} />
      <Legend
        samples={state.filteredSamples}
        allSamples={state.samples}
        metadata={state.metadata}
        settings={state.deferredLayerSettings}
      />
    </aside>
  );
}
