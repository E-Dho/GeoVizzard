import { memo, useMemo } from "react";
import { Crosshair, Eye, EyeOff, LocateFixed, MapPin, RotateCcw } from "lucide-react";
import type { NeighborInfo, SampleRecord } from "../data/schema";
import type { useAppState } from "../state/useAppState";

type Props = ReturnType<typeof useAppState>;

type NeighborRow = {
  neighbor: NeighborInfo;
  sample?: SampleRecord;
};

function formatCoordinate(lat: number, lon: number) {
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

function Field({ label, value }: { label: string; value: unknown }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="field">
      <span>{label}</span>
      <strong>{typeof value === "number" ? Number(value.toFixed(4)) : String(value)}</strong>
    </div>
  );
}

function ExplorationPanelComponent(state: Props) {
  const {
    selectedSample,
    selectedMaterializedSample,
    samples,
    explorationSettings,
    setExplorationSettings,
    setFilters,
    setViewState
  } = state;
  const sampleById = useMemo(
    () => new Map(samples.map((sample) => [sample.sample_id, sample])),
    [samples]
  );
  const neighborRows = useMemo<NeighborRow[]>(
    () =>
      selectedSample?.neighbors?.map((neighbor) => ({
        neighbor,
        sample: sampleById.get(neighbor.id)
      })) ?? [],
    [sampleById, selectedSample?.neighbors]
  );
  const availableNeighborIds = useMemo(
    () => neighborRows.flatMap((row) => (row.sample ? [row.sample.sample_id] : [])),
    [neighborRows]
  );
  const selectedGroup = selectedSample?.original_group ?? selectedSample?.group;
  const sameGroupCount = state.sameGroupMaterializedSamples.length;
  const materializedIds = new Set(explorationSettings.materializedNeighborIds);
  const predictedIds = new Set(explorationSettings.predictedNeighborIds);

  const updateMaterialized = (id: string, enabled: boolean) => {
    setExplorationSettings((current) => {
      const materialized = new Set(current.materializedNeighborIds);
      const predicted = new Set(current.predictedNeighborIds);
      if (enabled) {
        materialized.add(id);
      } else {
        materialized.delete(id);
        predicted.delete(id);
      }
      return {
        ...current,
        materializedNeighborIds: Array.from(materialized),
        predictedNeighborIds: Array.from(predicted),
        selectedMaterializedSampleId:
          current.selectedMaterializedSampleId === id && !enabled
            ? undefined
            : current.selectedMaterializedSampleId
      };
    });
  };

  const updatePredicted = (id: string, enabled: boolean) => {
    setExplorationSettings((current) => {
      const materialized = new Set(current.materializedNeighborIds);
      const predicted = new Set(current.predictedNeighborIds);
      if (enabled) {
        materialized.add(id);
        predicted.add(id);
      } else {
        predicted.delete(id);
      }
      return {
        ...current,
        materializedNeighborIds: Array.from(materialized),
        predictedNeighborIds: Array.from(predicted)
      };
    });
  };

  const selectMaterialized = (sample?: SampleRecord) => {
    if (!sample) return;
    setExplorationSettings((current) => ({
      ...current,
      selectedMaterializedSampleId: sample.sample_id
    }));
  };

  const materializeAll = () => {
    setExplorationSettings((current) => ({
      ...current,
      materializedNeighborIds: availableNeighborIds,
      predictedNeighborIds: current.predictedNeighborIds.filter((id) =>
        availableNeighborIds.includes(id)
      )
    }));
  };

  const clearMaterialized = () => {
    setExplorationSettings((current) => ({
      ...current,
      materializedNeighborIds: [],
      predictedNeighborIds: [],
      selectedMaterializedSampleId: undefined
    }));
  };

  const showPredictedForAll = () => {
    setExplorationSettings((current) => ({
      ...current,
      materializedNeighborIds: availableNeighborIds,
      predictedNeighborIds: availableNeighborIds
    }));
  };

  const hidePredictedForAll = () => {
    setExplorationSettings((current) => ({
      ...current,
      predictedNeighborIds: []
    }));
  };

  const toggleSameGroupMaterialized = () => {
    setExplorationSettings((current) => ({
      ...current,
      sameGroupMaterialized: !current.sameGroupMaterialized,
      sameGroupPredicted: current.sameGroupMaterialized ? false : current.sameGroupPredicted,
      sameGroupNeighbors: current.sameGroupMaterialized ? false : current.sameGroupNeighbors
    }));
  };

  const toggleSameGroupPredicted = () => {
    setExplorationSettings((current) => ({
      ...current,
      sameGroupPredicted: !current.sameGroupPredicted
    }));
  };

  const toggleSameGroupNeighbors = () => {
    setExplorationSettings((current) => ({
      ...current,
      sameGroupNeighbors: !current.sameGroupNeighbors
    }));
  };

  if (!selectedSample) {
    return (
      <section className="panel-section exploration-panel">
        <h2>Explore selection</h2>
        <p className="muted">Select a sample and press Only to explore its neighbours.</p>
      </section>
    );
  }

  return (
    <>
      <section className="panel-section exploration-panel">
        <div className="exploration-title">
          <div>
            <h2>Explore selection</h2>
            <p className="muted">{selectedSample.sample_id}</p>
          </div>
          <button
            type="button"
            onClick={() => setFilters((current) => ({ ...current, selectedOnly: false }))}
            title="Return to the regular settings"
          >
            <RotateCcw size={15} />
            Settings
          </button>
        </div>
        <div className="field-grid">
          <Field label="Focus age BP" value={selectedSample.age_bp} />
          <Field label="Original group" value={selectedSample.original_group} />
          <Field label="Group" value={selectedSample.group} />
          <Field label="Neighbours" value={neighborRows.length} />
        </div>
        <div className="button-row two-up">
          <button type="button" onClick={materializeAll} disabled={!availableNeighborIds.length}>
            <Eye size={15} />
            True all
          </button>
          <button
            type="button"
            onClick={clearMaterialized}
            disabled={!explorationSettings.materializedNeighborIds.length}
          >
            <EyeOff size={15} />
            Clear
          </button>
        </div>
        <div className="button-row two-up">
          <button type="button" onClick={showPredictedForAll} disabled={!availableNeighborIds.length}>
            <MapPin size={15} />
            Pred all
          </button>
          <button
            type="button"
            onClick={hidePredictedForAll}
            disabled={!explorationSettings.predictedNeighborIds.length}
          >
            <EyeOff size={15} />
            Hide pred
          </button>
        </div>
        <div className="same-group-control">
          <button
            type="button"
            className={explorationSettings.sameGroupMaterialized ? "active-action" : ""}
            onClick={toggleSameGroupMaterialized}
            disabled={!selectedGroup}
            title={
              selectedGroup
                ? "Show all samples from the selected sample's original group"
                : "No original group or group value available"
            }
          >
            <Eye size={15} />
            Same group
          </button>
          <span>
            {selectedGroup
              ? `${selectedGroup}${explorationSettings.sameGroupMaterialized ? ` · ${sameGroupCount} shown` : ""}`
              : "No group"}
          </span>
        </div>
        {explorationSettings.sameGroupMaterialized && (
          <div className="button-row two-up">
            <button
              type="button"
              className={explorationSettings.sameGroupPredicted ? "active-action" : ""}
              onClick={toggleSameGroupPredicted}
              disabled={!sameGroupCount}
              title="Show predicted locations for the same-group samples"
            >
              <MapPin size={15} />
              Group pred
            </button>
            <button
              type="button"
              className={explorationSettings.sameGroupNeighbors ? "active-action" : ""}
              onClick={toggleSameGroupNeighbors}
              disabled={!sameGroupCount}
              title="Show each same-group sample's kNN points and links"
            >
              <Crosshair size={15} />
              Group kNNs
            </button>
          </div>
        )}
      </section>

      <section className="panel-section exploration-panel">
        <h2>Materialized neighbours</h2>
        {neighborRows.length ? (
          <div className="materialized-list">
            {neighborRows.map(({ neighbor, sample }) => {
              const id = sample?.sample_id ?? neighbor.id;
              const isMaterialized = materializedIds.has(id);
              const isPredicted = predictedIds.has(id);
              const isSelected = explorationSettings.selectedMaterializedSampleId === id;
              return (
                <div
                  key={neighbor.id}
                  className={`materialized-row ${isSelected ? "selected" : ""}`}
                >
                  <button
                    type="button"
                    className="materialized-select"
                    disabled={!sample}
                    onClick={() => selectMaterialized(sample)}
                    title={sample ? "Show materialized sample details" : "No matching sample row found"}
                  >
                    <strong>{neighbor.id}</strong>
                    <span>{sample ? `${sample.age_bp} BP` : "No row"}</span>
                    <span>
                      {neighbor.distance !== undefined
                        ? `latent dist ${neighbor.distance.toFixed(1)}`
                        : ""}
                    </span>
                  </button>
                  <label className="mini-check">
                    <input
                      type="checkbox"
                      checked={isMaterialized}
                      disabled={!sample}
                      onChange={(event) => updateMaterialized(id, event.target.checked)}
                    />
                    True
                  </label>
                  <label className="mini-check">
                    <input
                      type="checkbox"
                      checked={isPredicted}
                      disabled={!sample}
                      onChange={(event) => updatePredicted(id, event.target.checked)}
                    />
                    Pred
                  </label>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="muted">Neighbour information not available in this dataset.</p>
        )}
      </section>

      <section className="panel-section exploration-panel">
        <h2>Materialized sample</h2>
        {selectedMaterializedSample ? (
          <>
            <div className="field-grid">
              <Field label="Sample" value={selectedMaterializedSample.sample_id} />
              <Field label="Age BP" value={selectedMaterializedSample.age_bp} />
              <Field label="Group" value={selectedMaterializedSample.group} />
              <Field label="Sequencing" value={selectedMaterializedSample.sequencing_type} />
              <Field
                label="True lat/lon"
                value={formatCoordinate(
                  selectedMaterializedSample.true_lat,
                  selectedMaterializedSample.true_lon
                )}
              />
              <Field
                label="Pred lat/lon"
                value={formatCoordinate(
                  selectedMaterializedSample.pred_lat,
                  selectedMaterializedSample.pred_lon
                )}
              />
              <Field label="Error km" value={selectedMaterializedSample.error_km} />
              <Field label="Sigma final" value={selectedMaterializedSample.sigma_final} />
            </div>
            <button
              type="button"
              onClick={() =>
                setViewState({
                  longitude: selectedMaterializedSample.true_lon,
                  latitude: selectedMaterializedSample.true_lat,
                  zoom: 6,
                  pitch: 0,
                  bearing: 0
                })
              }
            >
              <LocateFixed size={15} />
              Center true location
            </button>
          </>
        ) : (
          <p className="muted">
            <Crosshair size={14} /> Select a materialized neighbour from the list or map.
          </p>
        )}
      </section>
    </>
  );
}

export const ExplorationPanel = memo(ExplorationPanelComponent);
