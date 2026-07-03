import { useMemo } from "react";
import { Crosshair, LocateFixed, UsersRound, X } from "lucide-react";
import type { SampleRecord } from "../data/schema";
import type { MapViewState } from "../state/useAppState";

type Props = {
  sample?: SampleRecord;
  allSamples: SampleRecord[];
  selectedOnly: boolean;
  clearSelection: () => void;
  setViewState: React.Dispatch<React.SetStateAction<MapViewState>> | ((viewState: MapViewState) => void);
  setSelectedOnly: (enabled: boolean) => void;
};

function Field({ label, value }: { label: string; value: unknown }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="field">
      <span>{label}</span>
      <strong>{typeof value === "number" ? Number(value.toFixed(4)) : String(value)}</strong>
    </div>
  );
}

export function SampleInspector({
  sample,
  allSamples,
  selectedOnly,
  clearSelection,
  setViewState,
  setSelectedOnly
}: Props) {
  const sampleById = useMemo(() => {
    if (!sample) return new Map<string, SampleRecord>();
    return new Map(allSamples.map((record) => [record.sample_id, record]));
  }, [allSamples, sample]);

  if (!sample) {
    return (
      <aside className="inspector empty">
        <Crosshair size={18} />
        <span>Click a point or arrow to inspect a sample.</span>
      </aside>
    );
  }

  return (
    <aside className="inspector">
      <div className="inspector-title">
        <h2>{sample.sample_id}</h2>
        <button title="Clear selection" onClick={clearSelection}>
          <X size={16} />
        </button>
      </div>
      <div className="field-grid">
        <Field label="Age BP" value={sample.age_bp} />
        <Field label="Group" value={sample.group} />
        <Field label="Sequencing" value={sample.sequencing_type} />
        <Field label="Locality" value={sample.locality_id} />
        <Field label="True lat/lon" value={`${sample.true_lat.toFixed(4)}, ${sample.true_lon.toFixed(4)}`} />
        <Field label="Pred lat/lon" value={`${sample.pred_lat.toFixed(4)}, ${sample.pred_lon.toFixed(4)}`} />
        <Field label="Error km" value={sample.error_km} />
        <Field label="Sigma final" value={sample.sigma_final} />
        <Field label="Alpha precision" value={sample.alpha_precision} />
        <Field label="Potential outlier" value={sample.potential_outlier ? "Yes" : undefined} />
        <Field label="kNN lat/lon" value={sample.mu_knn_lat !== undefined && sample.mu_knn_lon !== undefined ? `${sample.mu_knn_lat.toFixed(4)}, ${sample.mu_knn_lon.toFixed(4)}` : undefined} />
        <Field label="MLP lat/lon" value={sample.mu_mlp_lat !== undefined && sample.mu_mlp_lon !== undefined ? `${sample.mu_mlp_lat.toFixed(4)}, ${sample.mu_mlp_lon.toFixed(4)}` : undefined} />
        <Field label="Sigma kNN" value={sample.sigma_knn_corrected} />
        <Field label="Sigma MLP" value={sample.sigma_mlp} />
      </div>
      <div className="button-row">
        <button
          className={selectedOnly ? "active-action" : ""}
          onClick={() => setSelectedOnly(!selectedOnly)}
          title={selectedOnly ? "Show all filtered samples again" : "Show only this selected sample"}
        >
          <Crosshair size={15} />
          {selectedOnly ? "Show all" : "Only"}
        </button>
        <button
          onClick={() =>
            setViewState({
              longitude: sample.pred_lon,
              latitude: sample.pred_lat,
              zoom: 6,
              pitch: 0,
              bearing: 0
            })
          }
        >
          <LocateFixed size={15} />
          Center
        </button>
      </div>
      <div className="neighbors">
        <h3><UsersRound size={15} /> Neighbours</h3>
        {sample.neighbors?.length ? (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Age BP</th>
                <th>Latent dist</th>
              </tr>
            </thead>
            <tbody>
              {sample.neighbors.map((neighbor) => {
                const neighborSample = sampleById.get(neighbor.id);
                return (
                  <tr key={neighbor.id}>
                    <td>{neighbor.id}</td>
                    <td>{neighborSample?.age_bp ?? ""}</td>
                    <td>{neighbor.distance?.toFixed(1) ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="muted">Neighbour information not available in this dataset.</p>
        )}
      </div>
    </aside>
  );
}
